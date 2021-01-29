import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SharedModule } from '../shared/shared.module';
import { MarketPlaceRoutingModule } from './market-place-routing.module';
import { ManageMarketplaceModule } from './component/manage-marketplace/manage-marketplace.module';
import { MarketplaceComponent } from './component/marketplace.component';
import { ChartModule } from 'angular2-highcharts';
import { HighchartsStatic } from 'angular2-highcharts/dist/HighchartsService';
import { SolutionHoverModule } from '../shared/component/modal/solution-hover/solution-hover.module';
import { SolutionPopupModule } from '../shared/component/modal/solution-popup/solution-popup.module';
import { PocMarketPlaceModule } from './poc/poc-market-place.module';
import { SolutionAnalyticsModule } from '../shared/component/modal/solution-analytics/solution-analytics.module';

declare var require: any;

export function highchartsFactory() {
    const hc = require('highcharts');
    const hm = require('highcharts/highcharts-more');
    hm(hc);
    return hc;
}

@NgModule({
    declarations: [
        MarketplaceComponent
    ],
    imports: [
        CommonModule,
        SharedModule,
        FormsModule,
        MarketPlaceRoutingModule,
        ManageMarketplaceModule,
        ChartModule,
        SolutionHoverModule,
        SolutionPopupModule,
        PocMarketPlaceModule,
        SolutionAnalyticsModule
    ],
    providers: [
        {
            provide: HighchartsStatic,
            useFactory: highchartsFactory
        }
    ]
})
export class MarketPlaceModule { }
