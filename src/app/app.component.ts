import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatStepperModule } from '@angular/material/stepper';

@Component({
    selector: 'app-root',
    imports: [
        MatInput,
        MatFormFieldModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatStepperModule,
        MatChipsModule,
        MatIconModule,
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
})
export class AppComponent {
    public altControl = new FormControl('', [Validators.required]);
    public alternatives: string[] = [];

    public altAmountClicked(): void {
        console.log(this.altControl.value);
    }

    public onRemoveAlt(alt: string) {
        this.alternatives = this.alternatives.filter((x) => x !== alt);
    }

    public onAddAlt(event: MatChipInputEvent): void {
        const value = (event.value || '').trim();

        // Add our keyword
        if (value) {
            this.alternatives.push(value);
        }

        // Clear the input value
        event.chipInput!.clear();
    }
}
