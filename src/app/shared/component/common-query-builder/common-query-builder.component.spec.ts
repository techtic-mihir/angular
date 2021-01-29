import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CommonQueryBuilderComponent } from './common-query-builder.component';

describe('CommonQueryBuilderComponent', () => {
    let component: CommonQueryBuilderComponent;
    let fixture: ComponentFixture<CommonQueryBuilderComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CommonQueryBuilderComponent]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CommonQueryBuilderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
