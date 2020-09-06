import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;

import * as d3Select from 'd3-selection';
import * as d3Axis from 'd3-axis';

import { ConnectingLineSettings } from './settings';
import { IViewModel, ICategory, IGroup } from './viewModel';

    export class ChartManager {

        // SVG element for the entire chart; will be a child of the main visual element
            private chartContainer: d3.Selection<SVGElement, any, any, any>;
        // SVG group element to consolidate the category axis elements
            private categoryAxisContainer: d3.Selection<SVGElement, any, any, any>;
        // SVG group element to consolidate the value axis elements
            private valueAxisContainer: d3.Selection<SVGElement, any, any, any>;
        // SVG group element to consolidate the visual data elements
            private plotContainer: d3.Selection<SVGElement, any, any, any>;
        // Category elements, as bound by D3
            categories: d3Select.Selection<Element | d3Select.EnterElement | Document | Window | SVGGElement, ICategory, SVGElement, any>

            constructor(element: HTMLElement) {
                // Instantiate main chart container
                    this.chartContainer = d3Select.select(element)
                        .append('svg')
                            .attr('id', 'dumbbellChartContainer');
                // Category & value axes, and plot container are all chldren of main chart container
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

        /**
         * Resize the main chart viewport
         *
         * @param viewport      - height/width available for chart
         */
            updateViewport(viewport: IViewport) {
                this.chartContainer
                    .attr('width', viewport.width)
                    .attr('height', viewport.height);
            }

        /**
         * Remove all child content of main chart elements, effectively showing a blank chart.
         */
            clear() {
                this.plotContainer.selectAll('*').remove();
                this.categoryAxisContainer.selectAll('*').remove();
                this.valueAxisContainer.selectAll('*').remove();
            }

        /**
         * Plot the chart based on supplied ViewModel
         * 
         * @param viewModel     - visual ViewModel
         */
            plot(viewModel: IViewModel) {
                // Ensure our visual responds appropriately for the user if the data view isn't valid
                    if (!viewModel.isValid) {
                        // Clear down chart
                            this.clear();
                    } else {
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
                        // Update data bindings on elements
                            this.rebindCategories(viewModel);
                    }
            }

        /**
         * Create an array of SVG group (g) elements and bind an `ICategory` to each; move it to the correct position on the axis
         * 
         * @param viewModel     - visual ViewModel
         */
            private rebindCategories(viewModel: IViewModel) {
                this.categories = this.plotContainer
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
                                            .call(
                                                this.transformDumbbellLine,
                                                viewModel.categoryAxis.scale,
                                                viewModel.valueAxis.scale,
                                                viewModel.settings.connectingLines
                                            );

                                // Add circles for data points
                                    group
                                        .selectAll('.dumbbellPoint')
                                        .data((d) => d.groups)
                                        .join('circle')
                                            .classed('dumbbellPoint', true)
                                            .call(
                                                this.transformDumbbellCircle,
                                                viewModel.categoryAxis.scale,
                                                viewModel.valueAxis.scale,
                                                viewModel.settings.dataPoints.radius
                                            );

                                // Add data labels for first category
                                    group
                                        .filter((d, di) => di === 0)
                                        .selectAll('.dataLabel')
                                        .data((d) => d.groups)
                                        .join('text')
                                            .classed('dataLabel', true)
                                            .call(
                                                this.transformDataLabel,
                                                viewModel.valueAxis.scale,
                                                viewModel.settings.dataLabels.show
                                            );

                                // Group element is used for any further operations
                                    return group;
                            },
                            update => {
                                // Re-position groups
                                    update.call(this.transformCategoryGroup, viewModel.categoryAxis.scale);
                                // Re-position line coordinates
                                    update
                                        .select('.dumbbellLine')
                                        .call(
                                            this.transformDumbbellLine,
                                            viewModel.categoryAxis.scale,
                                            viewModel.valueAxis.scale,
                                            viewModel.settings.connectingLines
                                        );
                                // Re-position circle coordinates
                                    update
                                        .selectAll('.dumbbellPoint')
                                        .data((d) => d.groups)
                                        .join('circle')
                                            .classed('dumbbellPoint', true)
                                            .call(
                                                this.transformDumbbellCircle,
                                                viewModel.categoryAxis.scale,
                                                viewModel.valueAxis.scale,
                                                viewModel.settings.dataPoints.radius
                                            );
                                // Re-position data labels
                                    update
                                        .filter((d, di) => di === 0)
                                        .selectAll('.dataLabel')
                                        .data((d) => d.groups)
                                        .join('text')
                                            .classed('dataLabel', true)
                                            .call(
                                                this.transformDataLabel,
                                                viewModel.valueAxis.scale,
                                                viewModel.settings.dataLabels.show
                                            );
                                // Group element is used for any further operations
                                    return update;
                            },
                            exit => {
                                exit.remove();
                            }
                        );

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
         * Consolidates logic to handle positioning and attributes of the dumbbell line element within a category
         *
         * @param selection     - D3 selection (line) to apply transformation to
         * @param categoryScale - category scale object to use for positioning
         * @param valueScale    - value scale object to use for plotting by measure value
         * @param settings      - parsed connecting line settings from dataView
         */
            private transformDumbbellLine(
                selection: d3.Selection<SVGLineElement, ICategory, any, any>,
                categoryScale: d3.ScaleBand<string>,
                valueScale: d3.ScaleLinear<number, number>,
                settings: ConnectingLineSettings
            ) {
                const midpoint = categoryScale.bandwidth() / 2;
                selection
                    .attr('x1', (d) => valueScale(d.min))
                    .attr('x2', (d) => valueScale(d.max))
                    .attr('y1', midpoint)
                    .attr('y2', midpoint)
                    .style('stroke-width', settings.strokeWidth)
                    .style('stroke', settings.color);
            }

        /**
         * Consolidates logic to handle positioning and attributes of the dumbbell circle elements within a category
         *
         * @param selection     - D3 selection (circle) to apply transformation to
         * @param categoryScale - category scale object to use for positioning
         * @param valueScale    - value scale object to use for plotting by measure value
         * @param radius        - circle radius, in px
         */
            private transformDumbbellCircle(
                selection: d3.Selection<SVGCircleElement, IGroup, any, any>,
                categoryScale: d3.ScaleBand<string>,
                valueScale: d3.ScaleLinear<number, number>,
                radius: number
            ) {
                const
                    midpoint = categoryScale.bandwidth() / 2;
                selection
                    .attr('cx', (d) => valueScale(d.value))
                    .attr('cy', midpoint)
                    .attr('r', radius)
                    .attr('fill', (d) => d.color);
            }

        /**
         * Consolidates logic to handle positioning and attributes of the data label text elements within a category
         *
         * @param selection     - D3 selection (circle) to apply transformation to
         * @param valueScale    - value scale object to use for plotting by measure value
         * @param show          - whether to show labels or not
         */
            private transformDataLabel(
                selection: d3.Selection<SVGTextElement, IGroup, any, any>,
                valueScale: d3.ScaleLinear<number, number>,
                show: boolean
            ) {
                selection
                    .attr('x', (d) => valueScale(d.value))
                    .attr('y', 0)
                    .attr('fill', (d) => d.color)
                    .text((d) => d.name)
                    .style('visibility', show ? 'visible' : 'hidden');
            }        

    }