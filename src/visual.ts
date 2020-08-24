/*
*  Power BI Visual CLI
*
*  Copyright (c) Microsoft Corporation
*  All rights reserved.
*  MIT License
*
*  Permission is hereby granted, free of charge, to any person obtaining a copy
*  of this software and associated documentation files (the ""Software""), to deal
*  in the Software without restriction, including without limitation the rights
*  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*  copies of the Software, and to permit persons to whom the Software is
*  furnished to do so, subject to the following conditions:
*
*  The above copyright notice and this permission notice shall be included in
*  all copies or substantial portions of the Software.
*
*  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*  THE SOFTWARE.
*/
'use strict';

import 'core-js/stable';
import './../style/visual.less';
import powerbi from 'powerbi-visuals-api';
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;

import * as d3Select from 'd3-selection';
import * as d3Axis from 'd3-axis';

import { VisualSettings } from './settings';
import { mapViewModel, ICategory, IGroup } from './viewModel';

export class Visual implements IVisual {
    // Visual's main (root) element
        private target: HTMLElement;
    // SVG element for the entire chart; will be a child of the main visual element
        private chartContainer: d3.Selection<SVGElement, any, any, any>;
    // SVG group element to consolidate the category axis elements
        private categoryAxisContainer: d3.Selection<SVGElement, any, any, any>;
    // SVG group element to consolidate the value axis elements
        private valueAxisContainer: d3.Selection<SVGElement, any, any, any>;
    // SVG group element to consolidate the visual data elements
        private plotContainer: d3.Selection<SVGElement, any, any, any>;
    // Parsed visual settings
        private settings: VisualSettings;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.target = options.element;
        // Create our fixed elements, as these only need to be done once
            this.chartContainer = d3Select.select(this.target)
                .append('svg')
                    .attr('id', 'dumbbellChartContainer');
            this.categoryAxisContainer = this.chartContainer
                .append('g')
                    .classed('categoryAxis', true)
                    .classed('axis', true);
            this.valueAxisContainer = this.chartContainer
                .append('g')
                    .classed('valueAxis', true)
                    .classed('axis', true);
            this.plotContainer = this.chartContainer
                .append('g')
                    .classed('plotArea', true);
    }

    public update(options: VisualUpdateOptions) {
        this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
        console.log('Visual update', options);

        // The options.viewport object gives us the current visual's size, so we can assign this to
        // our chart container to allow it to grow and shrink.
            this.chartContainer
                .attr('width', options.viewport.width)
                .attr('height', options.viewport.height);
        
        // Map static data into our view model
            const viewModel = mapViewModel(this.settings, options.viewport);

        // Call our axis functions in the appropriate containers
            this.categoryAxisContainer
                .attr('transform', `translate(${viewModel.categoryAxis.translate.x}, ${viewModel.categoryAxis.translate.y})`)
                .call(d3Axis.axisLeft(viewModel.categoryAxis.scale));

            this.valueAxisContainer
                .attr('transform', `translate(${viewModel.valueAxis.translate.x}, ${viewModel.valueAxis.translate.y})`)
                .call(
                    d3Axis.axisBottom(viewModel.valueAxis.scale)
                        .ticks(viewModel.valueAxis.tickCount)
                        .tickSize(viewModel.valueAxis.tickSize)
                );

        // Create an array of SVG group (g) elements and bind an `ICategory` to each; move it to the correct position on the axis
            const categories = this.plotContainer
                    .selectAll('.category')
                        .data(viewModel.categories)
                        .join(
                            enter => {
                                // Create grouping element
                                    const group = enter.append('g')
                                        .classed('category', true)
                                        .call(this.transformCategoryGroup, viewModel.categoryAxis.scale);

                                // Add line
                                    group
                                        .append('line')
                                            .classed('dumbbellLine', true)
                                            .call(this.transformDumbbellLine, viewModel.categoryAxis.scale, viewModel.valueAxis.scale);

                                // Add circles for data points
                                    group
                                        .selectAll('.dumbbellPoint')
                                        .data((d) => d.groups)
                                        .join('circle')
                                            .classed('dumbbellPoint', true)
                                            .call(this.transformDumbbellCircle, viewModel.categoryAxis.scale, viewModel.valueAxis.scale);

                                // Group element is used for any further operations
                                    return group;
                            },
                            update => {
                                // Re-position groups
                                    update.call(this.transformCategoryGroup, viewModel.categoryAxis.scale);

                                // Re-position line coordinates
                                    update.select('.dumbbellLine')
                                        .call(this.transformDumbbellLine, viewModel.categoryAxis.scale, viewModel.valueAxis.scale);

                                // Re-position circle co-ordinates
                                    update.selectAll('.dumbbellPoint')
                                        .call(this.transformDumbbellCircle, viewModel.categoryAxis.scale, viewModel.valueAxis.scale);

                                // Group element is used for any further operations
                                    return update;
                            },
                            exit => {
                                exit.remove();
                            });
        
        // Inspect the view model in the browser console
            console.log(viewModel);
    }

    /**
     * Consolidates logic to handle positioning and attributes of category groups for enter and update
     *
     * @param selection     - D3 selection (group) to apply transformation to
     * @param categoryScale - category scale object to use for positioning
     */
        private transformCategoryGroup(
            selection: d3.Selection<SVGGElement, ICategory, any, any>,
            categoryScale: d3.ScaleBand<string>
        ) {
            selection
                .attr('transform', (d) => `translate(0, ${categoryScale(d.name)})`);
        }

    /**
     * Consolidates logic to handle positioning anf attributes of the dumbbell line element within a category
     *
     * @param selection     - D3 selection (line) to apply transformation to
     * @param categoryScale - category scale object to use for positioning
     * @param valueScale    - value scale object to use for plotting by measure value
     */
        private transformDumbbellLine(
            selection: d3.Selection<SVGLineElement, ICategory, any, any>,
            categoryScale: d3.ScaleBand<string>,
            valueScale: d3.ScaleLinear<number, number>
        ) {
            const midpoint = categoryScale.bandwidth() / 2;
            selection
                .attr('x1', (d) => valueScale(d.min))
                .attr('x2', (d) => valueScale(d.max))
                .attr('y1', midpoint)
                .attr('y2', midpoint);
        }

    /**
     * Consolidates logic to handle positioning anf attributes of the dumbbell circle elements within a category
     *
     * @param selection     - D3 selection (circle) to apply transformation to
     * @param categoryScale - category scale object to use for positioning
     * @param valueScale    - value scale object to use for plotting by measure value
     */
        private transformDumbbellCircle(
            selection: d3.Selection<SVGCircleElement, IGroup, any, any>,
            categoryScale: d3.ScaleBand<string>,
            valueScale: d3.ScaleLinear<number, number>
        ) {
            const
                radius = 5,
                midpoint = categoryScale.bandwidth() / 2;
            selection
                .attr('cx', (d) => valueScale(d.value))
                .attr('cy', midpoint)
                .attr('r', radius)
                .attr('fill', (d) => d.color);
        }

    private static parseSettings(dataView: DataView): VisualSettings {
        return <VisualSettings>VisualSettings.parse(dataView);
    }

    /**
     * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the
     * objects and properties you want to expose to the users in the property pane.
     *
     */
    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
        return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
    }
}