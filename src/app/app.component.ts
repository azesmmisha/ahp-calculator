import { StepperSelectionEvent } from '@angular/cdk/stepper';
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

interface IComparison {
    entity: string;
    importances: Importance[];
}

interface Importance {
    entity: string;
    value: number;
    valueLabel: MarkLabel;
    disabled: boolean;
}

interface ICrCompMatrix {
    compValues: IComparison[];
    processed: boolean;
    consistent: boolean;
    priorityVector: string;
    result: WeightResult[];
    weightedSumVector: number[];
    consistencyVector: number[];
    lambdaMax: number;
    ci: number;
    ri: number;
    cr: number;
    threshold: number;
}

interface IAltComparison {
    processed: boolean;
    consistent: boolean;
    matrixes: IAltCompMatrix[];
}

interface IAltCompMatrix extends ICrCompMatrix {
    criterion: string;
}

interface IResult {
    alternative: string;
    priorityVector: number[];
    result: number;
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
    //#region properties
    public altControl = new FormControl('');
    public alternatives: string[] = [];
    public criteriaControl = new FormControl('');
    public criterias: string[] = [];

    public criteriaComparisonMatrix: ICrCompMatrix = null;
    public altComparison: IAltComparison = null;
    public results: IResult[] = null;

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
    //#endregion properties

    constructor(private snackBar: MatSnackBar) {}

    public onStepChange(event: StepperSelectionEvent): void {
        if (event.selectedIndex === 1) {
            if (!this.criteriaComparisonMatrix) {
                this.criteriaComparisonMatrix = this.createCriteriaComparisonMatrix();
            }
        }
        if (event.selectedIndex === 2) {
            if (!this.altComparison) {
                this.altComparison = this.createAltComparison();
            }
        }
        if (event.selectedIndex === 3) {
            this.results = [];
            for (let altI = 0; altI < this.alternatives.length; altI++) {
                const resRow: IResult = {
                    alternative: this.alternatives[altI],
                    priorityVector: [],
                    result: 0,
                };
                for (let mI = 0; mI < this.altComparison.matrixes.length; mI++) {
                    resRow.priorityVector.push(this.altComparison.matrixes[mI].result[altI].geomMeanNormalized);
                }
                resRow.result = resRow.priorityVector.reduce(
                    (sum, item, index) => sum + item * this.criteriaComparisonMatrix.result[index].geomMeanNormalized,
                    0
                );
                this.results.push(resRow);
            }
            console.log(this.results);
        }
    }

    //#region Step 1: Alternatives And Criterias
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

    //#region Step 2: Criteria Comparison Matrix

    private createCriteriaComparisonMatrix(): ICrCompMatrix {
        const matrix: ICrCompMatrix = {
            compValues: [],
            processed: false,
            consistent: false,
            priorityVector: null,
            weightedSumVector: [],
            consistencyVector: [],
            result: [],
            lambdaMax: null,
            ci: null,
            ri: null,
            cr: null,
            threshold: null,
        };
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
            matrix.compValues.push(row);
        }
        return matrix;
    }

    public onImportanceSelect(rowIndex: number, colIndex: number, value: MarkLabel): void {
        // Update selected cell
        this.criteriaComparisonMatrix.compValues[rowIndex].importances[colIndex].valueLabel = value;
        this.criteriaComparisonMatrix.compValues[rowIndex].importances[colIndex].value = this.markValues[value];

        // Update reciprocal cell (lower triangle)
        const reciprocalLabel = this.getReciprocalMarkLabel(value);
        this.criteriaComparisonMatrix.compValues[colIndex].importances[rowIndex].valueLabel = reciprocalLabel;
        this.criteriaComparisonMatrix.compValues[colIndex].importances[rowIndex].value = this.markValues[reciprocalLabel];
    }

    public onProcessCriteriaComparison() {
        this.processComparisonMatrix(this.criteriaComparisonMatrix);
    }

    //#endregion

    //#region Step 3: Alternatives Compare Matrixes

    private createAltComparison(): IAltComparison {
        const comparison: IAltComparison = {
            matrixes: [],
            processed: null,
            consistent: null,
        };

        // For each criterion, create a comparison matrix of alternatives
        for (let i = 0; i < this.criterias.length; i++) {
            const matrix: IAltCompMatrix = {
                criterion: this.criterias[i],
                compValues: [],
                processed: false,
                consistent: false,
                priorityVector: null,
                weightedSumVector: [],
                consistencyVector: [],
                result: [],
                lambdaMax: null,
                ci: null,
                ri: null,
                cr: null,
                threshold: null,
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
                matrix.compValues.push(row);
            }
            comparison.matrixes.push(matrix);
        }
        return comparison;
    }

    public onAltImportanceSelect(mIndex: number, rowIndex: number, colIndex: number, value: MarkLabel): void {
        // Update selected cell
        this.altComparison.matrixes[mIndex].compValues[rowIndex].importances[colIndex].valueLabel = value;
        this.altComparison.matrixes[mIndex].compValues[rowIndex].importances[colIndex].value = this.markValues[value];

        // Update reciprocal cell (lower triangle)
        const reciprocalLabel = this.getReciprocalMarkLabel(value);
        this.altComparison.matrixes[mIndex].compValues[colIndex].importances[rowIndex].valueLabel = reciprocalLabel;
        this.altComparison.matrixes[mIndex].compValues[colIndex].importances[rowIndex].value = this.markValues[reciprocalLabel];
    }

    public onProcessAltComparison(mIndex: number): void {
        this.processComparisonMatrix(this.altComparison.matrixes[mIndex]);
    }

    public onProcessAltsComparisons(): void {
        for (let i = 0; i < this.altComparison.matrixes.length; i++) {
            this.processComparisonMatrix(this.altComparison.matrixes[i]);
        }
        const consistent = this.altComparison.matrixes.filter((x) => !x.consistent);
        this.altComparison.consistent = consistent.length === 0;
    }

    //#endregion

    //#region Step 4: Results
    //#endregion

    //#region helpers

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
            11: 1.51,
            12: 1.48,
            13: 1.56,
            14: 1.57,
            15: 1.59,
        };
        return riValues[n] || 1.49;
    }

    private nthRoot(x: number, n: number) {
        return Math.pow(x, 1 / n);
    }

    private processComparisonMatrix(matrix: ICrCompMatrix): void {
        const criteriaWeights = matrix.compValues.map((criterionData) => {
            const product = criterionData.importances.reduce((acc: number, importance: any) => {
                return acc * importance.value;
            }, 1);

            const geomMean = this.nthRoot(product, matrix.compValues.length);
            return { entity: criterionData.entity, geomMean: geomMean };
        });

        const sumGeomMeans = criteriaWeights.reduce((sum, item) => sum + item.geomMean, 0);

        matrix.result = criteriaWeights.map((item) => ({
            entity: item.entity,
            geomMean: item.geomMean,
            geomMeanNormalized: item.geomMean / sumGeomMeans,
        }));

        //// CHECK CR
        const n = matrix.compValues.length;
        const RI = this.getRandomIndex(n);
        const weights = matrix.result.map((w) => w.geomMeanNormalized);

        // 1. Calculate Weighted Sum Vector (WSV)
        const weightedSumVector = matrix.compValues.map((row) => {
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
        matrix.priorityVector = matrix.result.map((x) => x.geomMeanNormalized.toFixed(8)).join(', ');
        matrix.weightedSumVector = weightedSumVector;
        matrix.consistencyVector = consistencyVector;
        matrix.lambdaMax = lambdaMax;
        matrix.ci = CI;
        matrix.ri = RI;
        matrix.cr = CR;
        matrix.threshold = threshold;

        matrix.consistent = CR < threshold;
        matrix.processed = true;
    }

    //#endregion
}
