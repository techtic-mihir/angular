import {
    Component,
    OnInit,
    ViewChild,
    ElementRef,
    ChangeDetectorRef,
    AfterViewChecked,
    OnDestroy,
} from "@angular/core";
import {
    FrameworkService,
    MarketplaceService,
    FlashMessagesService,
    ProgramService,
    HeaderService,
    AppService,
} from "../../shared/services";
import { Framework } from "../../shared/model/framework";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { FormGroup, FormBuilder, NgForm } from "@angular/forms";
import { forkJoin, fromEvent, ReplaySubject } from "rxjs";
import * as $ from "jquery";
import * as Highcharts from "highcharts";
import { ModalDismissReasons } from "@ng-bootstrap/ng-bootstrap";
import {
    debounceTime,
    distinctUntilChanged,
    filter,
    tap,
    merge,
    takeUntil,
} from "rxjs/operators";
import { ArraySortPipe } from "../../shared/pipes/sort.pipe";
import * as d3 from "d3";
import { BubbleChartComponent } from "../../shared/component/bubble-chart/bubble-chart.component";
import { Router, NavigationEnd } from "@angular/router";
import * as moment from "moment";
import { HttpParams } from "@angular/common/http";

@Component({
    selector: "marketplace",
    templateUrl: "./marketplace.component.html",
    styleUrls: ["./marketplace.component.scss"],
})
export class MarketplaceComponent
    implements OnInit, OnDestroy, AfterViewChecked {
    cyberXVideo: boolean = true;
    savedSolutionsBoolean: boolean = true;
    contactedSolutionsBoolean: boolean = true;
    implementedSolutionsBoolean: boolean = true;

    @ViewChild("modalContent", { static: false }) content: NgbModal;
    @ViewChild("modalVendor", { static: false }) modalVendor: NgbModal;
    @ViewChild("modalSolution", { static: false }) modalSolution: NgbModal;
    @ViewChild("vendorGroupDirective", { static: true })
    vendorGroupDirective: NgForm;
    @ViewChild("container", { static: true }) container: ElementRef;
    @ViewChild("searchSolution", { static: false }) searchSolution: ElementRef;
    @ViewChild("chart", { static: false }) chart: BubbleChartComponent;

    vendorGroup: FormGroup;

    categoryList: any = [];
    controlList: any = [];
    subcontrolList: any = [];
    subcontrols: any = [];
    providerList: any = [];
    providers: any = [];
    updatedProviders: any = [];
    types: any = [];
    updatedTypes: any = [];

    selectedCategories: any = [];
    selectedFrameworks: any = [];
    selectedControls: any = [];
    selectedSubcontrols: any = [];
    selectedTypes: any = [];
    typeList: any = [];
    selectedProviders: any = [];
    selectedFilters: any = [];
    allSolutions: any = [];
    closeResult = "";

    companyChart: Array<any> = [];
    savedSolutions: Array<any> = [];
    contactedSolutions: Array<any> = [];
    implementedSolutions: Array<any> = [];
    marketplaceResults: Array<any> = [];
    marketplaceAppendsResults: Array<any> = [];
    filters: Array<{ label: string; value: string }> = [];
    marketPlaceDetails: any;
    solutionDetails: any;
    frameworkLength: number = 0;
    frameworks: any;
    selectedFramework: any;
    currentFrameworkName: any;
    filterSolution: any = "";

    isPreviewHover: boolean = false;

    showSaved: number = 4;
    showContacted: number = 4;
    showImplemented: number = 4;

    solutionSavedVendor: string[] = [];
    solutionContactedVendor: string[] = [];
    solutionImplementedVendor: string[] = [];
    currentSolutionDetail: any;
    solutionInfo: any;
    pTypeClass: string;

    isSearch: boolean = false;

    loadMore: boolean = false;
    currentPage: number = 0;

    marketPlaceSearch: boolean = false;
    private searchSubscription: any;
    private subscription: any;

    //chart options and dataseries
    dataseries: Array<any> = [];
    options: any;
    isShowLevel: boolean = false;
    program: any;
    private _ngOnDestroy$: ReplaySubject<boolean> = new ReplaySubject(1);
    dateStart: any;
    triggerType: any;

    constructor(
        private frameworkService: FrameworkService,
        private programService: ProgramService,
        private modalService: NgbModal,
        private formBuilder: FormBuilder,
        private marketPlaceService: MarketplaceService,
        private _flashMessagesService: FlashMessagesService,
        private cdr: ChangeDetectorRef,
        private sort: ArraySortPipe,
        private appService: AppService,
        private router: Router
    ) { }

    ngOnInit() {
        this.dateStart = moment();

        this.appService.getLinkedApps();
        this.loadUsedFrameworks();

        // get dropdown filters, results
        this.getFilters();

        this.vendorGroup = this.formBuilder.group({
            vendorName: [""],
            productName: [""],
            description: [""],
            isContact: [false],
        });

        this.marketPlaceService.$getAllSolutions
            .pipe(takeUntil(this._ngOnDestroy$))
            .subscribe((val: any) => {
                this.getAllSolutions();
            });

        this.marketPlaceService.$openSidebar
            .pipe(takeUntil(this._ngOnDestroy$))
            .subscribe((val: any) => {
                this.solutionPopupClose(val.type);
            });

        this.options = {
            width: 650,
            height: 320,
            title: {
                text: this.getChartTitle(),
            },
            xAxis: {
                gridLineWidth: 0,
                title: {
                    text: "Fills most gaps",
                },
                labels: false,
                arrowOnEnd: true,
                lineWidth: 1,
                lineColor: "black",
                tickLength: 0,
            },
            yAxis: {
                gridLineWidth: 0,
                title: {
                    text: "Product Fit",
                },
                labels: false,
                arrowOnEnd: true,
                lineWidth: 1,
                lineColor: "black",
                tickLength: 0,
            },
        };
    }

    ngOnDestroy() {
        this._ngOnDestroy$.next(true);
        this._ngOnDestroy$.complete();
        this.appService.unsubscriptions();
        let period = moment
            .utc(moment(moment()).diff(this.dateStart))
            .format("HH:mm:ss");
        let data = { spentTime: period };
        this.activityTrigger("avg-user-time-spent-on-cx-store", data);
    }

    ngAfterViewChecked() {
        //your code to update the model
        this.cdr.detectChanges();
    }

    ngAfterViewInit() {
        const keyUps = fromEvent(
            this.searchSolution.nativeElement.querySelector(".txt-search"),
            "keyup"
        );
        const click = fromEvent(
            this.searchSolution.nativeElement.querySelector("#search-solution"),
            "click"
        );

        const keyPresses = keyUps.pipe(
            merge(click),
            filter((e: any) => {
                return e.keyCode || e.type == "click";
            }),
            distinctUntilChanged(),
            debounceTime(100)
        );

        keyPresses.subscribe((ctrlpress) => {
            var str = new String(this.filterSolution);
            if (str.length >= 3 || str.length == 0) {
                this.getFilters();
            }
        });
    }

    d3BubbleChart() {
        var data = [];
        this.companyChart.forEach((item: any) => {
            data.push({
                x: item.x_pos,
                y: item.y_pos,
                size: item.size,
                hover: {
                    title: item.company_name,
                    subtitle: `${item.no_of_subcontrol} subcontrols`,
                },
                title: item.company_name,
                data: item,
            });
        });

        this.dataseries = [];
        this.dataseries = data;
    }

    /**
     * Get saved solutions
     */
    getAllSolutions() {
        this.marketPlaceService
            .getAllSolutions()
            .pipe(takeUntil(this._ngOnDestroy$))
            .subscribe((response: any) => {
                this.allSolutions = response.data;
            });
    }

    /**
     * Get selected marketplace
     */
    getMarketplaceResult() {
        this.marketPlaceSearch = true;
        if (this.searchSubscription) {
            this.searchSubscription.unsubscribe();
        }
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        let data = {};
        data["category"] = this.selectedCategories.map((item: any) => item["id"]);
        data["control"] = this.selectedControls.map((item: any) => item["id"]);
        data["subcontrol"] = this.selectedSubcontrols.map(
            (item: any) => item["id"]
        );
        data["type"] = this.selectedTypes.map((item: any) => item["id"]);
        data["provider"] = this.selectedProviders.map((item: any) => item["id"]);
        data["search"] = this.filterSolution;

        this.isSearch = this.filterSolution ? true : false;

        if (this.triggerType == "category") {
            this.activityTrigger("dropdowns-categories", data);
        } else if (this.triggerType == "control") {
            this.activityTrigger("dropdowns-my-controls", data);
        } else if (this.triggerType == "subcontrol") {
            this.activityTrigger("dropdowns-my-subcontrols", data);
        } else if (this.triggerType == "type") {
            this.activityTrigger("dropdowns-type", data);
        } else if (this.triggerType == "provider") {
            this.activityTrigger("dropdowns-provider", data);
        }

        this.searchSubscription = this.marketPlaceService
            .getMarketplaceResult(data)
            .pipe(
                debounceTime(500),
                distinctUntilChanged(),
                takeUntil(this._ngOnDestroy$)
            )
            .subscribe((response: any) => {
                if (this.isSearch) {
                    this.activityTrigger("search-terms-searched-for", data);
                }

                let {
                    data: { results = [], appends = [] },
                } = response;

                // sort by order from least to greatest
                let apps = results.map((app: any) => {
                    app["subcontrols"] = this.sort.transform(
                        app["subcontrols"],
                        "progress"
                    );
                    return app;
                });

                this.marketplaceResults = this.sort.transform(
                    apps,
                    "progress_complete"
                );
                this.marketplaceAppendsResults = appends;
                this.marketPlaceSearch = false;

                this.companyChart = [];
                this.companyChart = response.data.chart;
                this.d3BubbleChart();
                this.updateChartTitle();
            });
    }

    getChartTitle() {
        this.currentFrameworkName = this.selectedFramework
            ? this.selectedFramework.name
            : "Your Program";
        return "Recommended Solutions to Improve " + this.currentFrameworkName;
    }

    addItems(items: any, type: any) {
        if (type == "type") {
            if (items.length == this.typeList.length) {
                this.pTypeClass = "all-checked";
            } else {
                this.pTypeClass = "";
            }
        }

        let allExist = this.selectedFilters.filter((ob: any) => ob.type == type);
        this.removeAllItems(allExist);

        let filterList = this.getFilterList(type);
        if (filterList.length > 0) {
            items.forEach((v: any) => {
                let exists: any;
                exists = filterList.find((ob: any) => ob.id == v.id);
                if (exists) {
                    this.addSelectedFilter(exists, type);
                }
            });
        }

        if (type == "control") {
            let appIds = [];
            appIds = $.map(items, function (o) {
                return o["id"];
            });
            if (appIds.length > 0) {
                this.getSubcontrolByControl(appIds);
            }
        }

        if (type == "category") {
            this.triggerType = "category";
        } else if (type == "control") {
            this.triggerType = "control";
        } else if (type == "subcontrol") {
            this.triggerType = "subcontrol";
        } else if (type == "type") {
            this.triggerType = "type";
        } else if (type == "provider") {
            this.triggerType = "provider";
        }

        this.getFilters();
    }

    addSelectedFilter(value: any, type: any) {
        if (this.selectedFilters.length > 0) {
            let valExist = "";
            if (type == "subcontrol") {
                valExist = this.selectedFilters.find(
                    (ob: any) =>
                        ob.sub_control_name == value.sub_control_name && ob.type == type
                );
            } else {
                valExist = this.selectedFilters.find(
                    (ob: any) => ob.name == value.name && ob.type == type
                );
            }

            if (!valExist) {
                let itemVal = "";
                let itemId = value.id;
                if (type == "subcontrol") {
                    itemVal = value.sub_control_name;
                } else {
                    itemVal = value.name;
                }

                this.selectedFilters.push({
                    label: itemVal,
                    id: itemId,
                    type: type,
                });
            }
        } else {
            this.selectedFilters.push({
                label: type == "subcontrol" ? value.sub_control_name : value.name,
                id: value.id,
                type: type,
            });
        }
    }

    getFilterList(type: any) {
        let list = [];
        switch (type) {
            case "category":
                list = this.categoryList;
                break;
            case "control":
                list = this.controlList;
                break;
            case "subcontrol":
                list = this.subcontrolList;
                break;
            case "type":
                list = this.typeList;
                break;
            case "provider":
                list = this.providerList;
                break;
        }

        return list;
    }

    removeItems(item: any) {
        var index = this.selectedFilters.indexOf(item);
        if (index != -1) {
            var filterIndex: any;
            switch (item.type) {
                case "category":
                    filterIndex = this.selectedCategories.findIndex(
                        (val: any) => val.id == item.id
                    );
                    if (filterIndex != -1) {
                        this.selectedCategories.splice(filterIndex, 1);
                    }
                    break;
                case "control":
                    filterIndex = this.selectedControls.findIndex(
                        (val: any) => val.id == item.id
                    );
                    if (filterIndex != -1) {
                        this.selectedControls.splice(filterIndex, 1);
                    }
                    let appIds = $.map(this.selectedControls, function (o) {
                        return o["id"];
                    });
                    this.getSubcontrolByControl(appIds);
                    break;
                case "subcontrol":
                    filterIndex = this.selectedSubcontrols.findIndex(
                        (val: any) => val.id == item.id
                    );
                    if (filterIndex != -1) {
                        this.selectedSubcontrols.splice(filterIndex, 1);
                    }
                    break;
                case "type":
                    filterIndex = this.selectedTypes.findIndex(
                        (val: any) => val.id == item.id
                    );
                    if (filterIndex != -1) {
                        this.selectedTypes.splice(filterIndex, 1);
                    }
                    this.pTypeClass = "";
                    break;
                case "provider":
                    filterIndex = this.selectedProviders.findIndex(
                        (val: any) => val.id == item.id
                    );
                    if (filterIndex != -1) {
                        this.selectedProviders.splice(filterIndex, 1);
                    }
                    break;
                default:
                    break;
            }
            this.selectedFilters.splice(index, 1);
        }

        this.getFilters();
    }

    getFilters(pagination: any = false) {
        this.marketPlaceSearch = true;
        if (this.searchSubscription) {
            this.searchSubscription.unsubscribe();
        }

        let filter = {};
        filter["category"] = this.selectedCategories.map((item: any) => item["id"]);
        filter["control"] = this.selectedControls.map((item: any) => item["id"]);
        filter["subcontrol"] = this.selectedSubcontrols.map(
            (item: any) => item["id"]
        );
        filter["provider"] = this.selectedProviders.map((item: any) => item["id"]);
        filter["type"] = this.selectedTypes.map((item: any) => item["id"]);
        if (!pagination) {
            this.currentPage = 1;
        }
        filter["page"] = this.currentPage;
        filter["search"] = this.filterSolution;
        this.isSearch = this.filterSolution ? true : false;

        if (this.triggerType == "category") {
            this.activityTrigger("dropdowns-categories", filter);
        } else if (this.triggerType == "control") {
            this.activityTrigger("dropdowns-my-controls", filter);
        } else if (this.triggerType == "subcontrol") {
            this.activityTrigger("dropdowns-my-subcontrols", filter);
        } else if (this.triggerType == "type") {
            this.activityTrigger("dropdowns-type", filter);
        } else if (this.triggerType == "provider") {
            this.activityTrigger("dropdowns-provider", filter);
        }
        this.searchSubscription = this.marketPlaceService
            .getFilters(filter)
            .pipe(
                takeUntil(this._ngOnDestroy$),
                debounceTime(500),
                distinctUntilChanged()
            )
            .subscribe((res: any) => {
                if (res["success"]) {
                    let { data } = res;

                    if (this.isSearch) {
                        this.activityTrigger("search-terms-searched-for", data);
                    }
                    this.loadMore = data["show_more"];
                    let {
                        results: { results = [], appends = [] },
                    } = res.data;

                    this.companyChart = [];
                    this.companyChart = res.data.chart;
                    this.d3BubbleChart();
                    this.updateChartTitle();

                    // sort by order from least to greatest
                    let apps = results.map((app: any) => {
                        app["subcontrols"] = this.sort.transform(
                            app["subcontrols"],
                            "progress"
                        );
                        return app;
                    });

                    let respagination: any = [];
                    respagination = this.sort.transform(apps, "progress_complete");
                    if (!pagination) {
                        this.marketplaceResults = [];
                    }
                    this.marketplaceResults = this.marketplaceResults.concat(
                        respagination
                    );
                    this.marketplaceAppendsResults = appends;
                    this.marketPlaceSearch = false;

                    if (filter["category"].length == 0) {
                        this.categoryList = data["categories"];
                    }

                    if (filter["control"].length == 0) {
                        this.controlList = this.sort.transform(
                            data["apps"],
                            "progress_complete"
                        );
                    }

                    if (filter["subcontrol"].length == 0) {
                        this.subcontrolList = this.sort.transform(
                            data["subcontrols"],
                            "progress"
                        );
                        this.subcontrols = this.subcontrolList;
                    }

                    let defaultValue = true;
                    if (
                        filter["category"].length == 0 &&
                        filter["control"].length == 0 &&
                        filter["subcontrol"].length == 0 &&
                        filter["type"].length == 0 &&
                        filter["provider"].length == 0
                    ) {
                        defaultValue = true;
                        this.providers = data["providers"];
                        this.types = data["types"];
                    } else if (
                        filter["type"].length > 0 ||
                        filter["provider"].length > 0
                    ) {
                        defaultValue = true;
                    } else if (
                        filter["category"].length > 0 ||
                        filter["control"].length > 0 ||
                        filter["subcontrol"].length > 0
                    ) {
                        defaultValue = false;
                        this.updatedProviders = data["providers"];
                        this.updatedTypes = data["types"];
                    }

                    if (defaultValue) {
                        this.typeList = this.types;
                        this.providerList = this.providers;
                    } else {
                        this.typeList = this.updatedTypes;
                        this.providerList = this.updatedProviders;
                    }
                }
            });
    }

    removeAllItems(info: any) {
        if (info.length > 0) {
            info.forEach((v: any, k: any) => {
                var index = this.selectedFilters.indexOf(v);
                if (index != -1) {
                    this.selectedFilters.splice(index, 1);
                }
            });
        }
    }

    /*** start of display modal code ***/
    solutionsPopup($event: Event, solutions: any, type: any) {
        let solutionInfo = solutions.solution;
        solutionInfo["sub_control_id"] = solutions.subcontrol_template_id;
        solutionInfo.isSaved = solutions.status == "saved" ? true : false;
        solutionInfo.isContacted = solutions.status == "contacted" ? true : false;
        solutionInfo.isImplemented =
            solutions.status == "implemented" ? true : false;
        solutionInfo.updated_at = solutions.updated_at;
        // this.currentSolutionDetail = solutionInfo;

        solutions["sub_control_id"] = solutions.subcontrol_template_id;
        solutions["solution_category_id"] = solutions.category_id;

        let {
            subcontrol_id = solutions["sub_control_id"],
            solution_id,
            solution_category_id: category_id = solutions["solution_category_id"],
        } = solutions;

        let input = { subcontrol_id, solution_id, category_id };

        this.marketPlaceService
            .getUserSolutionDetails(input)
            .pipe(takeUntil(this._ngOnDestroy$))
            .subscribe(
                (data: any) => {
                    this.currentSolutionDetail = data.data;
                    this.currentSolutionDetail.sub_control_id =
                        solutions.subcontrol_template_id;
                    this.modalService
                        .open(this.content, {
                            size: "lg",
                            windowClass: "marketplace-modal marketplace-details-modal",
                        })
                        .result.then(
                            (result) => {
                                this.savedSolutionsBoolean = true;
                                this.contactedSolutionsBoolean = true;
                            },
                            (reason) => {
                                this.savedSolutionsBoolean = true;
                                this.contactedSolutionsBoolean = true;
                            }
                        );
                },
                (error) => {
                    console.log(error);
                }
            );
    }

    solutionsClickModal($event: Event, solution: any, subcontrol?: any) {
        if (
            Object.keys(subcontrol).length > 0 &&
            subcontrol.hasOwnProperty("sub_control_id")
        ) {
            solution["sub_control_id"] = subcontrol.sub_control_id;
        } else if (solution.hasOwnProperty("parent_category_id")) {
            solution["solution_category_id"] = solution["parent_category_id"];
        }

        let {
            subcontrol_id = solution["sub_control_id"],
            solution_id,
            solution_category_id: category_id = solution["solution_category_id"],
        } = solution;
        let input = { subcontrol_id, solution_id, category_id };

        this.activityTrigger("vendor-tiles-clicked", input);

        this.marketPlaceService
            .getUserSolutionDetails(input)
            .pipe(takeUntil(this._ngOnDestroy$))
            .subscribe(
                (data: any) => {
                    this.currentSolutionDetail = data.data;
                    this.currentSolutionDetail.sub_control_id = subcontrol.sub_control_id;
                    this.modalService
                        .open(this.content, {
                            size: "lg",
                            windowClass: "marketplace-modal marketplace-details-modal",
                        })
                        .result.then(
                            (result) => {
                                // console.log(result);
                            },
                            (reason) => {
                                // console.log(reason);
                            }
                        );
                },
                (error) => {
                    console.log(error);
                }
            );
    }

    solutionPopupClose(val: any) {
        if (val == "saved") {
            this.savedSolutionsBoolean = true;
        } else if (val == "contacted") {
            this.contactedSolutionsBoolean = true;
        } else if (val == "implemented") {
            this.implementedSolutionsBoolean = true;
        } else {
            this.savedSolutionsBoolean = true;
            this.contactedSolutionsBoolean = true;
            this.implementedSolutionsBoolean = true;
        }
    }
    /*** end of display modals code ***/

    /**
     * vendor popup open here
     */
    vendorPopup() {
        this.activityTrigger("don't-see-vendor-clicks");
        this.modalService
            .open(this.modalVendor, { size: "lg", windowClass: "marketplace-modal" })
            .result.then(
                (result) => {
                    // console.log(result);
                },
                (reason) => {
                    // console.log(reason);
                }
            );
    }

    /**
     * vendor form submit here
     */
    onSubmit() {
        let data = this.vendorGroup.value;
        this.marketPlaceService
            .postRequest("marketplace/vendor", data)
            .pipe(takeUntil(this._ngOnDestroy$))
            .subscribe(
                (data: any) => {
                    this.onReset();
                    this.modalService.dismissAll();
                    this._flashMessagesService.show(
                        "Success! Thank you for suggesting this vendor.",
                        { cssClass: "alert-success", timeout: 3000 }
                    );
                },
                (error) => {
                    this._flashMessagesService.show(
                        "Your request could not be processed. Please try again.",
                        { cssClass: "alert-danger" }
                    );
                }
            );
    }

    onReset() {
        this.vendorGroup.reset();
    }

    /*** start for load framework and framework apps ***/
    loadUsedFrameworks() {
        forkJoin([
            this.frameworkService.getUsedFrameworkMarketplaceList(),
            this.programService.getProgram(),
        ])
            .pipe(takeUntil(this._ngOnDestroy$))
            .subscribe((data: any) => {
                this.frameworks = data[0].data;
                let program = data[1].data;
                this.frameworkLength = this.frameworks.length;
                this.selectedFramework = this.getFrameworkById(program.framework_id);

                if (
                    this.selectedFramework &&
                    this.selectedFramework.has_multiple_levels
                ) {
                    this.isShowLevel = true;
                }
                this.program = program;

                this.updateChartTitle();
            });
    }

    private getFrameworkById(id: number): any {
        let framework: Framework;
        this.frameworks.forEach((framework1: Framework) => {
            if (framework1.id == id) {
                framework = framework1;
            }
        });
        return framework;
    }

    onFrameworkChange(framework: any) {
        //this.programService.hasProgramLevel.next(framework);
        this.selectedFramework = framework;
        let frameworkId = this.selectedFramework.id;
        let appData: any = [];
        let prgramId = "";
        let programData = {
            apps: appData,
            prgramId: prgramId,
            framework_id: frameworkId,
            frameworkChange: true,
        };
        this.program = programData;
        if (this.selectedFramework && this.selectedFramework.has_multiple_levels) {
            this.isShowLevel = true;
            let element = document.getElementById("left-side-area");
            element.className = "cybrex-content-area-left is-level";
        } else {
            this.isShowLevel = false;
            let element = document.getElementById("left-side-area");
            element.className = "cybrex-content-area-left";
        }
        this.programService
            .saveProgram(programData)
            .pipe(takeUntil(this._ngOnDestroy$))
            .subscribe(
                () => {
                    this.clearfilter();
                    this.getFilters();
                    this.getAllSolutions();
                    this.getProgram();
                    this.appService.getLinkedApps();
                },
                (error) => console.log(error),
                () => "Request for frameworks complete"
            );
    }

    getProgram() {
        this.programService
            .getProgram()
            .pipe(takeUntil(this._ngOnDestroy$))
            .subscribe((res) => {
                this.program = res.data;
            });
    }
    /*** end for load framework and framework apps ***/

    clearfilter() {
        this.selectedCategories = [];
        this.selectedControls = [];
        this.selectedSubcontrols = [];
        this.selectedTypes = [];
        this.selectedProviders = [];
        this.filterSolution = "";
        this.selectedFilters = [];
    }

    getSubcontrolByControl(appIds: any) {
        let subcontrols: Array<any> = [];

        subcontrols = this.subcontrols.filter((subcontrol: any) =>
            appIds.includes(subcontrol.app_id)
        );
        if (!subcontrols.length) {
            subcontrols = this.subcontrols;
        }

        this.subcontrolList = subcontrols;
    }

    increaseShow(type: string): void {
        switch (type) {
            case "saved":
                this.showSaved += 4;
                break;
            case "contacted":
                this.showContacted += 4;
                break;
            case "implemented":
                this.showImplemented += 4;
                break;
        }
    }

    decreaseShow(): void {
        this.showSaved = 4;
    }

    chartFilter(point: any) {
        let bubble = point.data;
        let company = this.providerList.find(
            (item: any) => item.id == bubble.company_id
        );
        company.type = "provider";

        let items = [];
        items.push(company);

        let filterIndex = this.selectedProviders.findIndex(
            (val: any) => val.id == company.id
        );
        if (filterIndex != -1) {
            this.selectedProviders.splice(filterIndex, 1);
        } else {
            this.selectedProviders.push(company);
        }

        let index = this.selectedFilters.findIndex(
            (val: any) => val.id == company.id
        );
        if (index != -1) {
            this.selectedFilters.splice(index, 1);
        } else {
            this.selectedFilters.push({
                label: company.name,
                id: company.id,
                type: company.type,
            });
        }

        this.activityTrigger("bubbles-clicked-in-bubble-chart", bubble);
        // this.getMarketplaceResult();
        this.getFilters();
    }

    resetFilters(event: any) {
        this.filterSolution = "";
        this.getFilters();
    }

    updateChartTitle() {
        let options = this.options;
        options["title"]["text"] = this.getChartTitle();
        this.options = Object.assign({}, options);
    }

    onLevelChange(level: any) {
        // get dropdown filters, results
        this.getFilters();
        this.appService.getLinkedApps();
    }

    activityTrigger(slug: string, data?: any) {
        this.marketPlaceService
            .activityTrigger(slug, data)
            .subscribe((response: any) => { });
    }

    activityTriggerManage(slug: string) {
        this.marketPlaceService.activityTrigger(slug).subscribe((response: any) => {
            this.router.navigate(["marketplace/manage"]);
        });
    }
    paginateControler() {
        this.currentPage++;
        this.getFilters(true);
    }
    open(content) {
        this.modalService
            .open(content, {
                ariaLabelledBy: "modal-basic-title",
                windowClass: "video-popup",
            })
            .result.then(
                (result) => {
                    this.closeResult = `Closed with: ${result}`;
                },
                (reason) => {
                    this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
                }
            );
    }

    private getDismissReason(reason: any): string {
        if (reason === ModalDismissReasons.ESC) {
            return "by pressing ESC";
        } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
            return "by clicking on a backdrop";
        } else {
            return `with: ${reason}`;
        }
    }
}
