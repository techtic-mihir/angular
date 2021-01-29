import { Component, OnInit, Input, SimpleChange, Output, EventEmitter } from '@angular/core';
import * as d3 from "d3";
declare var labeler: any;

@Component({
    selector: 'bubble-chart',
    templateUrl: './bubble-chart.component.html',
    styleUrls: ['./bubble-chart.component.scss']
})
export class BubbleChartComponent implements OnInit {

    private _groupBy: any = {};
    private _labels: any = {};
    private _links: any = [];
    private _labelArray = [];
    private _anchorArray = [];

    private rExtent: any;
    private xScale: any;
    private yScale: any;
    private rScale: any;

    // set the dimensions and margins of the graph
    private margin = { top: 40, right: 20, bottom: 40, left: 40 };
    private height: number = 320;
    private width: number = 650;

    private svg: any;
    private g: any;
    private container: any;
    private tooltip: any;

    private defaultOptions = {
        width: 650,
        height: 320,
        title: {
            text: 'Recommended Solutions to Improve Your Program'
        },
        xAxis: {
            title: {
                text: 'Fills most gaps'
            },
            arrowOnEnd: true,
            lineWidth: 1,
            lineColor: 'black',
            tickLength: 0
        },
        yAxis: {
            title: {
                text: 'Product Fit'
            },
            arrowOnEnd: true,
            lineWidth: 1,
            lineColor: 'black',
            tickLength: 0
        },
        bubble: {
            text: true
        }
    }

    //default data series for bubble chart
    private _dataseries: Array<any> = [];

    @Output() bubbleClick = new EventEmitter();

    @Input('dataseries')
    set dataseries(value: Array<any>) {
        this._dataseries = value;
    }

    //get all data series for bubble chart
    get dataseries(): Array<any> {
        return this._dataseries;
    }

    //options behavior for bubble chart
    private _options: any;
    @Input('options')
    set options(options: any) {
        this._options = Object.assign({}, this.defaultOptions, options);
    }

    get options(): any {
        return this._options;
    }

    constructor() { }

    ngOnInit() { }

    ngOnChanges(inputs: SimpleChange) {
        if (
            (inputs['dataseries'] && inputs['dataseries']['currentValue'].length > 0) ||
            (inputs['options'] && Object.keys(inputs['options']['currentValue']).length > 0)
        ) {
            this.initChart();
        }
    }

    private initChart() {
        //removed before build new chart
        d3.select("#bubblechart").selectAll('svg').remove();
        d3.select("#bubblechart").selectAll('.tooltip').remove();

        this.container = d3.select('#bubblechart');

        this._createSvg();

        //init axies
        this._initXAxis();
        this._initYAxis();
        this._initRScale();

        this._setTooltip();
        this._setTitle();
        this._drawBubble();
    }

    private _createSvg() {
        this.svg = this.container
            .append('svg')
            .attr('class', 'chart')
            .attr("width", this.width)
            .attr("height", this.height)
            .style("background-color", "#ffffff");

        // Draw boundaries of figure
        this.svg.append("rect")
            .attr("x", 0.0)
            .attr("y", 0.0)
            .attr("width", this.width)
            .attr("height", this.height)
            .style("fill-opacity", '0.0')
            .style("stroke", "black")
            .style("stroke-opacity", "0.4");

        this.g = this.svg
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
    }

    private _setTitle() {
        this.svg.append("text")
            .attr("x", 325)
            .attr("y", this.margin.top - 10)
            .append("tspan")
            .attr("fill", "#000000")
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "500")
            .style("color", "#000000")
            .style('font-family', "Lucida Grande, Lucida Sans Unicode, Arial, Helvetica, sans-serif")
            .text(this.options.title.text);
    }

    private _initXAxis() {
        this.xScale = d3.scaleLinear()
            .domain([0, d3.max(this.dataseries, (d) => { return d.x + 800; })])
            .range([0, this.width - this.margin.left - this.margin.right]);

        var xAxis = d3.axisBottom(this.xScale).tickValues([]);

        // X axis and label
        var xa = this.g.append("g")
            .attr("transform", "translate(" + (0 - this.margin.left) + ", " + (0 - this.margin.left) + ")")
            .attr("class", "highcharts-axis highcharts-xaxis")
            .call(xAxis);

        xa.select('path')
            .attr("d", "M 38 282.5 L 630 282.5 L 626.5 279 L 640 282.5 L 626.5 286 L 630 282.5")
            .attr("class", "d3-axis-line")
            .attr("stroke", "black");

        xa.append('text')
            .attr("class", "highcharts-axis-title")
            .attr("x", 339)
            .attr("y", 299)
            .attr("transform", "translate(0,0)")
            .attr("text-anchor", "middle")
            .append('tspan')
            .style("color", "#666666")
            .style("fill", "#666666")
            .style("font-size", "12px")
            .text(this.options.xAxis.title.text);
    }

    private _initYAxis() {
        this.yScale = d3.scaleLinear()
            .domain([0, d3.max(this.dataseries, (d) => { return d.y + 800; })])
            .range([this.height - this.margin.top - this.margin.bottom, 0]);

        let yAxis = d3.axisLeft(this.yScale).scale(this.yScale).tickValues([]);

        // Y axis and label
        var ya = this.g.append("g")
            .attr("transform", "translate(" + (0 - this.margin.left) + ", " + (0 - this.margin.left) + ")")
            .attr("class", "highcharts-axis highcharts-yaxis")
            .call(yAxis);

        ya.select('path')
            .attr("d", "M 37.5 53 L 34 56.5 L 37.5 43 L 41 56.5 L 37.5 53 M 37.5 53 L 37.5 282")
            .attr("class", "d3-axis-line")
            .attr("stroke", "black");

        ya.append("text")
            .attr("x", 26)
            .attr("y", 167)
            .attr("transform", "translate(0,0) rotate(270 26 167.5)")
            .style("text-anchor", "middle")
            .append('tspan')
            .style("color", "#666666")
            .style("fill", "#666666")
            .style("font-size", "12px")
            .text(this.options.yAxis.title.text);
    }

    //define radius scale
    private _initRScale() {
        this.rExtent = d3.extent(this.dataseries, (d) => { return d.size; });
        this.rScale = d3.scaleLinear()
            .domain([0, d3.max(this.dataseries, (d) => { return d.size; })])
            .range([this.rExtent[0], this.rExtent[1]]);
    }

    private _drawBubble() {
        let { bubble: { text = true } } = this.options;

        this._labelArray = [];
        this._anchorArray = [];

        this.g.selectAll("circle")
            .data(this.dataseries)
            .enter()
            .append("circle")
            .attr("class", "bubbles")
            .attr("cx", (d: any) => {
                if (!this._groupBy.hasOwnProperty(d['y'])) {
                    this._groupBy[d['y']] = [];
                }

                return this.xScale(d.x);
            })
            .attr("cy", (d: any) => {
                let x = d['x'];
                let y = d['y'];
                let r = d['size'];

                this._groupBy[y] = [...this._groupBy[y], {
                    cx: this.xScale(+x),
                    cy: this.yScale(y),
                    r: this.rScale(+r)
                }];
                return this.yScale(y);
            })
            .attr("r", (d: any) => {
                this._labelArray.push({
                    x: this.xScale(d.x),
                    y: this.yScale(d.y),
                    title: d.title,
                    hover: d.hover,
                    width: 0.0,
                    height: 0.0,
                    data: d.data
                });
                this._anchorArray.push({
                    x: this.xScale(d.x),
                    y: this.yScale(d.y),
                    r: this.rScale(d.size)
                });
                return this.rScale(d.size);
            })
            .attr("fill", (this.options.background) || "rgba(40,150,73,0.5)")
            .attr('fill-opacity', (d: any) => {
                let x = d.x, y = d.y;
                let count = 0, opacity = 1;
                for (let i = 0; i < this._groupBy[y].length; i++) {
                    if (this._groupBy[y][i].cx === this.xScale(+x)) {
                        count += 1;
                    }
                }
                if (count > 2) {
                    opacity = 0.3;
                } else if (count === 2) {
                    opacity = 0.5;
                }
                return opacity;
            });

        if (text) {
            this._labels = this.g
                .selectAll(".circlelabel")
                .data(this._labelArray)
                .enter()
                .append("text")
                .text((d: any) => { return d.title; })
                .attr("id", (d: any, i: number) => { return `text_${i}`; })
                .attr("class", "circlelabel")
                .style("text-anchor", "start")
                .style("color", (this.options.color) ? this.options.color : "#000000")
                .attr("fill", (this.options.color) ? this.options.color : "#000000")
                .style("font-size", (this.options.bubble.size) ? this.options.bubble.size : "11px")
                .attr("x", (d: any) => { return d.x; })
                .attr("y", (d: any) => { return d.x; });

            //Add height and width of label to array
            var index = 0;
            this._labels._groups[0].forEach((label) => {
                this._labelArray[index].width = label.getBBox().width;
                this._labelArray[index].height = label.getBBox().height;
                index += 1;
            });

            //Add links connecting label and circle
            this._links = this.g.selectAll(".link")
                .data(this._labelArray)
                .enter()
                .append("line")
                .attr("class", "labelLines")
                .attr("clip-path", "url(#clip)")
                .attr("id", (d: any, i: number) => { return `line_${i}`; })
                .attr("x1", (d: any) => d.x)
                .attr("y1", (d: any) => d.y)
                .attr("x2", (d: any) => d.x)
                .attr("y2", (d: any) => d.y)
                .attr("stroke-width", 0.5)
                .attr("stroke", "#6f6f6f");
        }

        this.g.selectAll("circle, .circlelabel, .labelLines")
            .on("mouseover", this._showTooltip)
            .on("mousemove", this._moveTooltip)
            .on("mouseleave", this._hideTooltip)
            .on("click", this.bubbleClicked);

        //load labeler js here
        labeler()
            .label(this._labelArray)
            .anchor(this._anchorArray)
            .width(this.width)
            .height(this.height)
            .start(2000);

        this._redrawLabels();
    }

    private _setTooltip() {
        this.tooltip = this.container
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("border-radius", "5px")
            .style("padding", "10px")
            .style("color", "#000000");
    }

    private _showTooltip = (d: any) => {
        this.tooltip
            .transition()
            .duration(200);

        this.tooltip
            .style("opacity", 1)
            .style("background-color", "#f1f2f7")
            .html(`<table>
					<tr><td>${d.hover.title}</td></tr>
					<tr><td>${d.hover.subtitle}</td></tr>
				</table>
			`)
            .style("left", (d3.mouse(d3.event.currentTarget)[0]) + "px")
            .style("top", (d3.mouse(d3.event.currentTarget)[1] - 40) + "px")
    }

    private _moveTooltip = (d: any) => {
        this.tooltip
            .style("opacity", 1)
            .style("background-color", "#f1f2f7")
            .html(`<table>
					<tr><td>${d.hover.title}</td></tr>
					<tr><td>${d.hover.subtitle}</td></tr>
				</table>
			`)
            .style("left", (d3.mouse(d3.event.currentTarget)[0]) + "px")
            .style("top", (d3.mouse(d3.event.currentTarget)[1] - 40) + "px")
    }

    private _hideTooltip = (d: any) => {
        this.tooltip
            .transition()
            .duration(200)
            .style("opacity", 0)
    }

    // You can give any function name
    private bubbleClicked = (d: any) => {
        this.bubbleClick.emit(d);
    }

    private _redrawLabels() {
        this._labels
            .transition()
            .duration(2000)
            .attr("x", (d: any) => d.x)
            .attr("y", (d: any) => d.y);

        this._links
            .transition()
            .duration(2000)
            .attr("x2", (d: any) => d.x)
            .attr("y2", (d: any) => d.y);
    }
}
