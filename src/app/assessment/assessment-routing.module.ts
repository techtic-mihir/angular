import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AssessmentComponent } from './components/assessment/assessment.component';
import { SurveyComponent } from './components/survey/survey.component';
import { SurveyV2Component } from './components/survey-v2/survey-v2.component';

const routes: Routes = [
    { path: '', component: AssessmentComponent, data: { view: 'list' } },
    { path: 'create', component: AssessmentComponent, data: { view: 'create' } },
    { path: 'edit/:uuid', component: AssessmentComponent, data: { view: 'edit' } },
    { path: 'edit-template/:uuid', component: AssessmentComponent, data: { view: 'edit-template' } },
    { path: 'form/:uuid', component: SurveyComponent },
    { path: 'v2/form/:uuid', component: SurveyV2Component }
];

@NgModule({
    imports: [
        RouterModule.forChild(routes)
    ],
    exports: [
        RouterModule
    ]
})
export class AssessmentRoutingModule { }
