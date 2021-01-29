import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MarketplaceComponent } from './component/marketplace.component';
import { ManageMarketplaceComponent } from './component/manage-marketplace/manage-marketplace.component';
import { PocMarketplaceComponent } from './poc/poc-marketplace.component';

const routes: Routes = [
    { path: '', component: MarketplaceComponent },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes)
    ],
    exports: [
        RouterModule
    ]
})
export class MarketPlaceRoutingModule { }
