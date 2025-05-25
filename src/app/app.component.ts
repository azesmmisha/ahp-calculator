import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';

interface WeightResult {
    entity: string;
    geomMean: number;
    geomMeanNormalized: number;
}

interface Importance {
    entity: string;
    value: number;
    valueLabel: MarkLabel;
    disabled: boolean;
}

interface IComparison {
    entity: string;
    importances: Importance[];
}

interface IComparisonByCriterion {
    criterion: string;
    consistent: boolean;
    comparisons: IComparison[];
}

type MarkLabel = '1/9' | '1/8' | '1/7' | '1/6' | '1/5' | '1/4' | '1/3' | '1/2' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatButtonModule,
        MatChipsModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatStepperModule,
        MatTableModule,
        MatCardModule,
        MatListModule,
        MatRadioModule,
        MatSelectModule,
        MatSnackBarModule,
    ],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent {
    public altControl = new FormControl('');
    public alternatives: string[] = ['germany', 'poland', 'turkey'];
    public criteriaControl = new FormControl('');
    public criterias: string[] = [
        'цiна',
        'якiсть сировини',
        'час доставки',
        'надiйнiсть(% виконаних контрактiв)',
        'сервiс та пiдтримка',
        'лог. iнфраструктура',
    ];

    public criteriaComparisonMatrix: IComparison[] = [];
    public criteriaComparisonDone: boolean = false;

    public altComparisonMatrixes: IComparisonByCriterion[] = [];
    public altComparisonDone: boolean = false;

    // Comparison matrix properties
    public markLabels = ['1/9', '1/8', '1/7', '1/6', '1/5', '1/4', '1/3', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    public markValues: { [key: string]: number } = {
        '1/9': 1 / 9,
        '1/8': 1 / 8,
        '1/7': 1 / 7,
        '1/6': 1 / 6,
        '1/5': 1 / 5,
        '1/4': 1 / 4,
        '1/3': 1 / 3,
        '1/2': 1 / 2,
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
        '7': 7,
        '8': 8,
        '9': 9,
    };

    constructor(private snackBar: MatSnackBar) {}

    //#region Step 1: Alternatives
    public onRemoveAlt(alt: string) {
        this.alternatives = this.alternatives.filter((x) => x !== alt);
    }

    public onAddAlt(event: MatChipInputEvent): void {
        const value = (event.value || '').trim();

        if (value) {
            this.alternatives.push(value);
        }

        event.chipInput!.clear();
    }
    //#endregion

    //#region Step 2: Criteria
    public onRemoveCriteria(cr: string) {
        this.criterias = this.criterias.filter((x) => x !== cr);
    }

    public onAddCriteria(event: MatChipInputEvent): void {
        const value = (event.value || '').trim();

        if (value) {
            this.criterias.push(value);
        }

        event.chipInput!.clear();
    }
    //#endregion

    //#region Step 3: Criteria Comparison Matrix
    public onStep2Finish() {
        this.criteriaComparisonMatrix = this.createCriteriaComparisonMatrix();
    }

    private createCriteriaComparisonMatrix(): IComparison[] {
        const matrix: IComparison[] = [];
        for (let i = 0; i < this.criterias.length; i++) {
            const row: IComparison = {
                entity: this.criterias[i],
                importances: [],
            };
            for (let j = 0; j < this.criterias.length; j++) {
                if (i === j) {
                    // Diagonal: 1 (disabled)
                    row.importances.push({
                        entity: this.criterias[j],
                        value: 1,
                        valueLabel: '1',
                        disabled: true,
                    });
                } else if (i < j) {
                    // Upper triangle: Editable (default to '1')
                    row.importances.push({
                        entity: this.criterias[j],
                        value: 1,
                        valueLabel: '1',
                        disabled: false,
                    });
                } else {
                    // Lower triangle: Reciprocal (disabled)
                    row.importances.push({
                        entity: this.criterias[j],
                        value: 1,
                        valueLabel: '1',
                        disabled: true,
                    });
                }
            }
            matrix.push(row);
        }
        return matrix;
    }

    public onImportanceSelect(rowIndex: number, colIndex: number, value: MarkLabel): void {
        // Update selected cell
        this.criteriaComparisonMatrix[rowIndex].importances[colIndex].valueLabel = value;
        this.criteriaComparisonMatrix[rowIndex].importances[colIndex].value = this.markValues[value];

        // Update reciprocal cell (lower triangle)
        const reciprocalLabel = this.getReciprocalMarkLabel(value);
        this.criteriaComparisonMatrix[colIndex].importances[rowIndex].valueLabel = reciprocalLabel;
        this.criteriaComparisonMatrix[colIndex].importances[rowIndex].value = this.markValues[reciprocalLabel];
    }

    public onCheckCriteriaComparison() {
        const criteriaWeightsData = this.calculateWeights(this.criteriaComparisonMatrix);

        const crResult = this.checkConsistencyRatio(this.criteriaComparisonMatrix, criteriaWeightsData);
        if (crResult.isConsistent) {
            this.criteriaComparisonDone = true;
            this.snackBar.open(`Matrix is consistent. ${crResult.info}`, 'Ok', {
                duration: 5000,
            });
        } else {
            this.snackBar.open(`Matrix is inconsistent. ${crResult.info}.\n Please, recompare!`, 'Ok', {
                duration: 5000,
            });
            this.createCriteriaComparisonMatrix();
        }
    }
    //#endregion

    //#region Step 4: Alternatives Compare Matrixes
    public onCompareAlts(): void {
        this.altComparisonMatrixes = this.createAltComparisonMatrixes();
    }

    public onAltImportanceSelect(mIndex: number, rowIndex: number, colIndex: number, value: MarkLabel): void {
        // Update selected cell
        this.altComparisonMatrixes[mIndex].comparisons[rowIndex].importances[colIndex].valueLabel = value;
        this.altComparisonMatrixes[mIndex].comparisons[rowIndex].importances[colIndex].value = this.markValues[value];

        // Update reciprocal cell (lower triangle)
        const reciprocalLabel = this.getReciprocalMarkLabel(value);
        this.altComparisonMatrixes[mIndex].comparisons[colIndex].importances[rowIndex].valueLabel = reciprocalLabel;
        this.altComparisonMatrixes[mIndex].comparisons[colIndex].importances[rowIndex].value = this.markValues[reciprocalLabel];
    }

    public onAltCRcheck(mIndex: number): void {
        const criteriaWeightsData = this.calculateWeights(this.altComparisonMatrixes[mIndex].comparisons);

        const crResult = this.checkConsistencyRatio(this.altComparisonMatrixes[mIndex].comparisons, criteriaWeightsData);
        if (crResult.isConsistent) {
            this.altComparisonMatrixes[mIndex].consistent = true;
            this.snackBar.open(`Matrix is consistent. ${crResult.info}`, 'Ok', {
                duration: 5000,
            });
        } else {
            this.altComparisonMatrixes[mIndex].consistent = false;
            this.snackBar.open(`Matrix is inconsistent. ${crResult.info}. Please, recompare!`, 'Ok', {
                duration: 5000,
            });
        }
    }

    public onCheckAltsComparisons(): void {
        console.log(this.altComparisonMatrixes);
        for (let i = 0; i < this.altComparisonMatrixes.length; i++) {
            const weights = this.calculateWeights(this.altComparisonMatrixes[i].comparisons);
            const crResult = this.checkConsistencyRatio(this.altComparisonMatrixes[i].comparisons, weights);
            this.altComparisonMatrixes[i].consistent = crResult.isConsistent;
        }
        const inconsistentAltsComparisonMatrixes = this.altComparisonMatrixes.filter((m) => !m.consistent);
        console.log(inconsistentAltsComparisonMatrixes);
        if (inconsistentAltsComparisonMatrixes.length > 0) {
            this.snackBar.open(
                `Some matrixes are inconsistent. Please, recompare: ${inconsistentAltsComparisonMatrixes
                    .map((x) => x.criterion)
                    .join(', ')}`,
                'Ok',
                { duration: 5000 }
            );
        } else {
            this.altComparisonDone = true;
        }
    }
    //#endregion

    //#region Step 5: Results
    public onResultsStep(): void {}
    //#endregion

    //#region helpers
    private createAltComparisonMatrixes(): IComparisonByCriterion[] {
        const matrix: IComparisonByCriterion[] = [];

        // For each criterion, create a comparison matrix of alternatives
        for (let i = 0; i < this.criterias.length; i++) {
            const comparisonByCriterion: IComparisonByCriterion = {
                criterion: this.criterias[i],
                consistent: false,
                comparisons: [],
            };

            for (let n = 0; n < this.alternatives.length; n++) {
                const row: IComparison = {
                    entity: this.alternatives[n],
                    importances: [],
                };
                for (let m = 0; m < this.alternatives.length; m++) {
                    if (n === m) {
                        // Diagonal (self-comparison)
                        row.importances.push({
                            entity: this.alternatives[m], // Changed from criterias to alternatives
                            value: 1,
                            valueLabel: '1',
                            disabled: true,
                        });
                    } else if (n < m) {
                        // Upper triangle (active comparisons)
                        row.importances.push({
                            entity: this.alternatives[m], // Changed from criterias to alternatives
                            value: 1,
                            valueLabel: '1',
                            disabled: false,
                        });
                    } else {
                        // Lower triangle (reciprocal values, disabled)
                        row.importances.push({
                            entity: this.alternatives[m], // Changed from criterias to alternatives
                            value: 1,
                            valueLabel: '1',
                            disabled: true,
                        });
                    }
                }
                comparisonByCriterion.comparisons.push(row);
            }
            matrix.push(comparisonByCriterion);
        }
        return matrix;
    }

    private calculateWeights(array: IComparison[]): WeightResult[] {
        const criteriaWeights = array.map((criterionData) => {
            const product = criterionData.importances.reduce((acc: number, importance: any) => {
                return acc * importance.value;
            }, 1);

            const geomMean = this.nthRoot(product, array.length);
            return { entity: criterionData.entity, geomMean: geomMean };
        });

        const sumGeomMeans = criteriaWeights.reduce((sum, item) => sum + item.geomMean, 0);

        const result = criteriaWeights.map((item) => ({
            entity: item.entity,
            geomMean: item.geomMean,
            geomMeanNormalized: item.geomMean / sumGeomMeans,
        }));

        return result;
    }

    private checkConsistencyRatio(comparisonMatrix: IComparison[], weightsData: WeightResult[]): { isConsistent: boolean; info: string } {
        const n = comparisonMatrix.length;
        const RI = this.getRandomIndex(n);
        const weights = weightsData.map((w) => w.geomMeanNormalized);

        // 1. Calculate Weighted Sum Vector (WSV)
        const weightedSumVector = comparisonMatrix.map((row) => {
            return row.importances.reduce((sum, imp, j) => sum + imp.value * weights[j], 0);
        });

        // 2. Compute Consistency Vector (CV)
        const consistencyVector = weightedSumVector.map((ws, i) => ws / weights[i]);

        // 3. Calculate λ_max (lambda max)
        const lambdaMax = consistencyVector.reduce((sum, cv) => sum + cv, 0) / n;

        // 4. Compute Consistency Index (CI)
        const CI = (lambdaMax - n) / (n - 1);

        // 5. Calculate Consistency Ratio (CR)
        const CR = CI / RI;

        // Determine threshold based on matrix size
        let threshold: number;
        if (n === 3) {
            threshold = 0.05;
        } else if (n === 4) {
            threshold = 0.08;
        } else {
            threshold = 0.1;
        }

        if (CR < threshold) {
            return { isConsistent: true, info: `${CR} < ${threshold}` };
        } else {
            return { isConsistent: false, info: `${CR} ≥ ${threshold}` };
        }
    }

    private getReciprocalMarkLabel(label: MarkLabel): MarkLabel {
        const reciprocalMap: Record<MarkLabel, MarkLabel> = {
            '1/9': '9',
            '1/8': '8',
            '1/7': '7',
            '1/6': '6',
            '1/5': '5',
            '1/4': '4',
            '1/3': '3',
            '1/2': '2',
            '1': '1',
            '2': '1/2',
            '3': '1/3',
            '4': '1/4',
            '5': '1/5',
            '6': '1/6',
            '7': '1/7',
            '8': '1/8',
            '9': '1/9',
        };
        return reciprocalMap[label];
    }

    private getRandomIndex(n: number): number {
        // Standard RI values for AHP (Saaty, 1980)
        const riValues: Record<number, number> = {
            1: 0,
            2: 0,
            3: 0.58,
            4: 0.9,
            5: 1.12,
            6: 1.24,
            7: 1.32,
            8: 1.41,
            9: 1.45,
            10: 1.49,
        };
        return riValues[n] || 1.49; // Default for n > 10
    }

    private nthRoot(x: number, n: number) {
        return Math.pow(x, 1 / n);
    }

    //#endregion
}
