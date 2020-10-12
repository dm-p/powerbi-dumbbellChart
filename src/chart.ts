import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;

import * as d3Select from 'd3-selection';
import * as d3Axis from 'd3-axis';
import * as d3Transition from 'd3-transition';

import { ConnectingLineSettings } from './settings';
import { IViewModel, ICategory, IGroupDataPoint, IGroupBase, VisualDataPoint } from './viewModel';

    export class ChartManager {

        // Default transition duration time, in ms
            private static DefaultTransitionDuration = 500;
        // SVG element for the entire chart; will be a child of the main visual element
            private chartContainer: d3.Selection<SVGElement, any, any, any>;
        // SVG group element to consolidate the category axis elements
            private categoryAxisContainer: d3.Selection<SVGElement, any, any, any>;
        // SVG group element to consolidate the value axis elements
            private valueAxisContainer: d3.Selection<SVGElement, any, any, any>;
        // SVG group element to consolidate the visual data elements
            private plotContainer: d3.Selection<SVGElement, any, any, any>;
        // Clear-catcher (used as an 'empty space' for selection events)
            clearCatcherContainer: d3.Selection<SVGRectElement, any, any, any>;
        // Category elements, as bound by D3
            categories: d3Select.Selection<SVGLineElement, ICategory, any, any>;
        // Individual group elements, as bound by D3
            points: d3.Selection<SVGCircleElement, IGroupDataPoint, any, ICategory>;
        // Data label elements, as bound by D3
            dataLabels: d3.Selection<SVGTextElement, IGroupBase, any, any>;
        // Category axis label elements, as bound by D3
            categoryLabels: d3.Selection<SVGTextElement, ICategory, any, any>;

            constructor(element: HTMLElement) {
                // Instantiate main chart container
                    this.chartContainer = d3Select.select(element)
                        .append('svg')
                            .attr('id', 'dumbbellChartContainer');
                // Clear-catcher sits underneath other elements
                    this.clearCatcherContainer = this.chartContainer
                        .append('rect')
                            .classed('clearCatcher', true);
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
                this.clearCatcherContainer
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
                 const visualData = this.plotContainer
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
                                                viewModel.settings.connectingLines,
                                                viewModel.shouldDimPoint
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
                                                viewModel.settings.dataPoints.radius,
                                                viewModel.shouldDimPoint
                                            );

                                // Add data labels for first category
                                    group
                                        .filter((d, di) => di === 0)
                                        .selectAll('.dataLabel')
                                        .data(viewModel.groups)
                                        .join('text')
                                            .classed('dataLabel', true)
                                            .call(
                                                this.transformDataLabel,
                                                viewModel.valueAxis.scale,
                                                viewModel.settings.dataLabels.show,
                                                viewModel.shouldDimPoint
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
                                            viewModel.settings.connectingLines,
                                            viewModel.shouldDimPoint
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
                                                viewModel.settings.dataPoints.radius,
                                                viewModel.shouldDimPoint
                                            );
                                // Re-position data labels
                                    update
                                        .filter((d, di) => di === 0)
                                        .selectAll('.dataLabel')
                                        .data(viewModel.groups)
                                        .join('text')
                                            .classed('dataLabel', true)
                                            .call(
                                                this.transformDataLabel,
                                                viewModel.valueAxis.scale,
                                                viewModel.settings.dataLabels.show,
                                                viewModel.shouldDimPoint
                                            );
                                // Group element is used for any further operations
                                    return update;
                            },
                            exit => {
                                exit.remove();
                            }
                        );
                // Select the elements we require for category interactivity
                    this.categories = visualData.selectAll('.dumbbellLine');
                // Select category axis labels and bind categories, for interactivity purposes
                    this.categoryLabels = this.categoryAxisContainer
                        .selectAll('.tick text');
                    this.categoryLabels
                        .datum((d, di) => viewModel.categories[di])
                        .classed('emphasized', (d) => viewModel.shouldEmphasizePoint(d));
                // Get our selection of points for interactivity purposes
                    this.points = visualData.selectAll('.dumbbellPoint');
                // Get our selection of data labels for interactivity purposes
                    this.dataLabels = visualData.selectAll('.dataLabel');
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
         * @param selection         - D3 selection (line) to apply transformation to
         * @param categoryScale     - category scale object to use for positioning
         * @param valueScale        - value scale object to use for plotting by measure value
         * @param settings          - parsed connecting line settings from dataView
         * @param shouldDimPoint    - helper method to apply styling for selection/highlighting
         */
            private transformDumbbellLine(
                selection: d3.Selection<SVGLineElement, ICategory, any, any>,
                categoryScale: d3.ScaleBand<string>,
                valueScale: d3.ScaleLinear<number, number>,
                settings: ConnectingLineSettings,
                shouldDimPoint: (dataPoint: VisualDataPoint) => boolean
            ) {
                const midpoint = categoryScale.bandwidth() / 2;
                selection
                    .transition(ChartManager.HandleTransition())
                        .attr('x1', (d) => valueScale(d.min))
                        .attr('x2', (d) => valueScale(d.max))
                        .attr('y1', midpoint)
                        .attr('y2', midpoint)
                    .end()
                    .then(() => {
                        selection
                            .transition(ChartManager.HandleTransition())
                                .style('stroke-width', settings.strokeWidth)
                                .style('stroke', settings.color);
                        selection
                            .classed('dimmed', (d) => shouldDimPoint(d));
                    });
            }

        /**
         * Consolidates logic to handle positioning and attributes of the dumbbell circle elements within a category
         *
         * @param selection         - D3 selection (circle) to apply transformation to
         * @param categoryScale     - category scale object to use for positioning
         * @param valueScale        - value scale object to use for plotting by measure value
         * @param radius            - circle radius, in px
         * @param shouldDimPoint    - helper method to apply styling for selection/highlighting
         */
            private transformDumbbellCircle(
                selection: d3.Selection<SVGCircleElement, IGroupDataPoint, any, any>,
                categoryScale: d3.ScaleBand<string>,
                valueScale: d3.ScaleLinear<number, number>,
                radius: number,
                shouldDimPoint: (dataPoint: VisualDataPoint) => boolean
            ) {
                const
                    midpoint = categoryScale.bandwidth() / 2;
                selection
                    .transition(ChartManager.HandleTransition())
                        .attr('cx', (d) => valueScale(d.highlighted ? d.highlightedValue : d.value))
                        .attr('cy', midpoint)
                    .end()
                    .then(() => {
                        selection
                            .transition(ChartManager.HandleTransition())
                                .attr('r', radius)
                                .attr('fill', (d) => d.color);
                        selection
                            .classed('dimmed', (d) => shouldDimPoint(d));
                    });
            }

        /**
         * Consolidates logic to handle positioning and attributes of the data label text elements within a category
         *
         * @param selection         - D3 selection (circle) to apply transformation to
         * @param valueScale        - value scale object to use for plotting by measure value
         * @param show              - whether to show labels or not
         * @param shouldDimPoint    - helper method to apply styling for selection/highlighting
         */
            private transformDataLabel(
                selection: d3.Selection<SVGTextElement, IGroupDataPoint, any, any>,
                valueScale: d3.ScaleLinear<number, number>,
                show: boolean,
                shouldDimPoint: (dataPoint: VisualDataPoint) => boolean
            ) {
                selection
                    .transition(ChartManager.HandleTransition())
                        .attr('x', (d) => valueScale(d.value))
                        .attr('y', 0)
                    .end()
                    .then(() => {
                        selection
                            .transition(ChartManager.HandleTransition())
                                .attr('fill', (d) => d.color)
                                .text((d) => d.name)
                                .style('visibility', show ? 'visible' : 'hidden');
                        selection
                            .classed('dimmed', (d) => shouldDimPoint(d));
                    });
            }

        /**
         * Generic handler for transition events when updating the DOM.
         *
         * @param duration  - time (in ms) for duration to take place
         */
            private static HandleTransition(duration: number = ChartManager.DefaultTransitionDuration) {
                return d3Transition.transition()
                    .duration(duration);
            }

    }