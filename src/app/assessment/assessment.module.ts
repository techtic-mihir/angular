import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { AssessmentRoutingModule } from './assessment-routing.module';
import { AssessmentComponent } from './components/assessment/assessment.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { QuestionComponent } from './components/question/question.component';
import { SurveyComponent } from './components/survey/survey.component';
import { SurveyV2Component } from './components/survey-v2/survey-v2.component';
import { QuestionnaireComponent } from './components/questionnaire/questionnaire.component';
import { CustomNgbDateParserFormatter } from '../shared/datetime/custom.ngdateformatter';
import { NgbDateParserFormatter, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { EditTemplateComponent } from './components/edit-template/edit-template.component';

export function getDateFormatter() {
    return new CustomNgbDateParserFormatter();
}

@NgModule({
    declarations: [
        AssessmentComponent,
        QuestionComponent,
        SurveyComponent,
        SurveyV2Component,
        QuestionnaireComponent,
        EditTemplateComponent
    ],
    imports: [
        NgbModule,
        CommonModule,
        AssessmentRoutingModule,
        ReactiveFormsModule,
        FormsModule,
        SharedModule,
        AutoCompleteModule
    ],
    providers: [{
        provide: NgbDateParserFormatter,
        useFactory: getDateFormatter
    }]
})
export class AssessmentModule { }
