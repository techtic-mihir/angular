import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModule, NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import { SolutionHoverComponent } from './solution-hover.component';
import { SharedModule } from '../../../../shared/shared.module';
import { SolutionPopupModule } from '../solution-popup/solution-popup.module';

@NgModule({
    imports: [
        NgbModule,
        CommonModule,
        SharedModule,
        SolutionPopupModule
    ],
    declarations: [
        SolutionHoverComponent
    ],
    exports: [
        SolutionHoverComponent
    ],
    entryComponents: [
        SolutionHoverComponent
    ]
})
export class SolutionHoverModule { }
