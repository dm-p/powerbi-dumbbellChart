import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import VisualUpdateOptions = powerbi.extensibility.VisualUpdateOptions;

import * as d3Select from 'd3-selection';
import * as d3Axis from 'd3-axis';
import * as d3Transition from 'd3-transition';

import { ConnectingLineSettings } from './settings';
import { IViewModel, ICategory, IGroupDataPoint, IGroupBase, VisualDataPoint, AxisOrientation } from './viewModel';

    export class ChartManager {

        // Default transition duration time, in ms
            private static DefaultTransitionDuration = 500;
        // SVG element for the entire chart; will be a child of the main visual element
            private chartContainer: d3.Selection<SVGElement, any, any, any>;
        // SVG group to abstract both axes
            private axesContainer: d3.Selection<SVGElement, any, any, any>;
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
                // Category & value axes, and plot container are all children of main chart container
                    this.axesContainer = this.chartContainer
                        .append('g')
                            .classed('axes', true);
                    this.initialiseAxes();
                    this.plotContainer = this.chartContainer
                        .append('g')
                            .classed('plotArea', true);
            }

        /**
         * Handle the teardown and setup of each axis container
         */
            private initialiseAxes() {
                this.axesContainer
                    .selectAll('*')
                    .remove();
                this.categoryAxisContainer = this.axesContainer
                    .append('g')
                    .classed('categoryAxis', true)
                    .classed('axis', true);
                this.valueAxisContainer = this.axesContainer
                    .append('g')
                    .classed('valueAxis', true)
                    .classed('axis', true);
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
            plot(viewModel: IViewModel, events: IVisualEventService, options: VisualUpdateOptions) {
                // Ensure our visual responds appropriately for the user if the data view isn't valid
                    if (!viewModel.isValid) {
                        // Clear down chart
                            this.clear();
                    } else {
                        // Call our axis functions in the appropriate containers
                            this.initialiseAxes();
                            const orientation = viewModel.settings.categoryAxis.orientation;
                            this.categoryAxisContainer
                                .attr('transform', `translate(${viewModel.categoryAxis.translate.x}, ${viewModel.categoryAxis.translate.y})`)
                                .call(
                                    orientation === 'left'
                                        ?   d3Axis.axisLeft(viewModel.categoryAxis.scale)
                                        :   d3Axis.axisBottom(viewModel.categoryAxis.scale)
                                );
                            this.valueAxisContainer
                                .attr('transform', `translate(${viewModel.valueAxis.translate.x}, ${viewModel.valueAxis.translate.y})`)
                                .call(
                                    (
                                        orientation === 'left'
                                            ?   d3Axis.axisBottom(viewModel.valueAxis.scale)
                                            :   d3Axis.axisLeft(viewModel.valueAxis.scale)
                                    )
                                        .ticks(viewModel.valueAxis.tickCount)
                                        .tickFormat((d) => viewModel.valueAxis.tickFormatter.format(d))
                                        .tickSize(viewModel.valueAxis.tickSize)
                                );
                        // Update data bindings on elements
                            this.rebindCategories(viewModel, events, options);
                    }
            }

        /**
         * Create an array of SVG group (g) elements and bind an `ICategory` to each; move it to the correct position on the axis
         * 
         * @param viewModel     - visual ViewModel
         */
            private rebindCategories(viewModel: IViewModel, events: IVisualEventService, options: VisualUpdateOptions) {
                const transitions: Promise<void>[] = [];
                const orientation = viewModel.settings.categoryAxis.orientation;
                const visualData = this.plotContainer
                    .selectAll('.category')
                        .data(viewModel.categories)
                        .join(
                            enter => {
                                // Create grouping element
                                    const group = enter.append('g')
                                        .classed('category', true)
                                        .call(
                                            this.transformCategoryGroup,
                                            viewModel.categoryAxis.scale,
                                            orientation
                                        );
                                // Add line
                                    group
                                        .append('line')
                                            .classed('dumbbellLine', true)
                                            .call(
                                                this.transformDumbbellLine,
                                                viewModel.categoryAxis.scale,
                                                viewModel.valueAxis.scale,
                                                viewModel.settings.connectingLines,
                                                orientation,
                                                viewModel.shouldDimPoint,
                                                transitions
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
                                                orientation,
                                                viewModel.shouldDimPoint,
                                                transitions
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
                                                viewModel.categoryAxis.scale,
                                                viewModel.valueAxis.scale,
                                                viewModel.settings.dataPoints.radius,
                                                orientation,
                                                viewModel.settings.dataLabels.show,
                                                viewModel.shouldDimPoint,
                                                transitions
                                            );

                                // Group element is used for any further operations
                                    return group;
                            },
                            update => {
                                // Re-position groups
                                    update.call(
                                        this.transformCategoryGroup,
                                        viewModel.categoryAxis.scale,
                                        orientation
                                    );
                                // Re-position line coordinates
                                    update
                                        .select('.dumbbellLine')
                                        .call(
                                            this.transformDumbbellLine,
                                            viewModel.categoryAxis.scale,
                                            viewModel.valueAxis.scale,
                                            viewModel.settings.connectingLines,
                                            orientation,
                                            viewModel.shouldDimPoint,
                                            transitions
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
                                                orientation,
                                                viewModel.shouldDimPoint,
                                                transitions
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
                                                viewModel.categoryAxis.scale,
                                                viewModel.valueAxis.scale,
                                                viewModel.settings.dataPoints.radius,
                                                orientation,
                                                viewModel.settings.dataLabels.show,
                                                viewModel.shouldDimPoint,
                                                transitions
                                            );
                                // Group element is used for any further operations
                                    return update;
                            },
                            exit => {
                                exit.remove();
                            }
                        );
                // Handle all promised transitions and then signal we've finished rendering
                    Promise.all(transitions)
                        .then(() => {
                            events.renderingFinished(options);
                        });
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
         * @param orientation   - orientation of category axis
         */
            private transformCategoryGroup(
                selection: d3.Selection<SVGGElement, ICategory, any, any>,
                categoryScale: d3.ScaleBand<string>,
                orientation: AxisOrientation
            ) {
                selection
                    .attr('transform', (d) => `translate(${
                        orientation === 'left'
                            ?   0
                            :   categoryScale(d.name)
                    }, ${
                        orientation === 'left'
                            ?   categoryScale(d.name)
                            :   0
                    })`);
            }

        /**
         * Consolidates logic to handle positioning and attributes of the dumbbell line element within a category
         *
         * @param selection         - D3 selection (line) to apply transformation to
         * @param categoryScale     - category scale object to use for positioning
         * @param valueScale        - value scale object to use for plotting by measure value
         * @param settings          - parsed connecting line settings from dataView
         * @param orientation       - orientation of category axis
         * @param shouldDimPoint    - helper method to apply styling for selection/highlighting
         * @param transitions       - existing array of transitions to add any new ones to
         */
            private transformDumbbellLine(
                selection: d3.Selection<SVGLineElement, ICategory, any, any>,
                categoryScale: d3.ScaleBand<string>,
                valueScale: d3.ScaleLinear<number, number>,
                settings: ConnectingLineSettings,
                orientation: AxisOrientation,
                shouldDimPoint: (dataPoint: VisualDataPoint) => boolean,
                transitions: Promise<void>[]
            ) {
                const midpoint = categoryScale.bandwidth() / 2;
                selection
                    .each((d, i, e) => {
                        const element = d3Select.select(e[i]);
                        transitions.push(
                            element
                                .classed('dimmed', shouldDimPoint(d))
                                .transition(ChartManager.HandleTransition())
                                    .attr('x1', orientation === 'left'
                                                ?   valueScale(d.min)
                                                :   midpoint
                                        )
                                    .attr('x2', orientation === 'left'
                                                ?   valueScale(d.max)
                                                :   midpoint
                                        )
                                    .attr('y1', orientation === 'left'
                                                ?   midpoint
                                                :   valueScale(d.min)
                                        )
                                    .attr('y2', orientation === 'left'
                                                ?   midpoint
                                                :   valueScale(d.max)
                                        )
                                .transition()
                                    .style('stroke-width', settings.strokeWidth)
                                    .style('stroke', settings.color)
                                .end()
                        );
                    });
            }

        /**
         * Consolidates logic to handle positioning and attributes of the dumbbell circle elements within a category
         *
         * @param selection         - D3 selection (circle) to apply transformation to
         * @param categoryScale     - category scale object to use for positioning
         * @param valueScale        - value scale object to use for plotting by measure value
         * @param radius            - circle radius, in px
         * @param orientation       - orientation of category axis
         * @param shouldDimPoint    - helper method to apply styling for selection/highlighting
         * @param transitions       - existing array of transitions to add any new ones to
         */
            private transformDumbbellCircle(
                selection: d3.Selection<SVGCircleElement, IGroupDataPoint, any, any>,
                categoryScale: d3.ScaleBand<string>,
                valueScale: d3.ScaleLinear<number, number>,
                radius: number,
                orientation: AxisOrientation,
                shouldDimPoint: (dataPoint: VisualDataPoint) => boolean,
                transitions: Promise<void>[]
            ) {
                const
                    midpoint = categoryScale.bandwidth() / 2;
                selection
                    .each((d, i, e) => {
                        const element = d3Select.select(e[i]);
                        transitions.push(
                            element
                                .classed('dimmed', shouldDimPoint(d))
                                .transition(ChartManager.HandleTransition())
                                    .attr('cx', orientation === 'left'
                                                ?   valueScale(d.highlighted ? d.highlightedValue : d.value)
                                                :   midpoint
                                        )
                                    .attr('cy', orientation === 'left'
                                                ?   midpoint
                                                :   valueScale(d.highlighted ? d.highlightedValue : d.value)
                                        )
                                .transition()
                                    .attr('r', radius)
                                    .attr('fill', d.color)
                                .end()
                        );
                    });
            }

        /**
         * Consolidates logic to handle positioning and attributes of the data label text elements within a category
         *
         * @param selection         - D3 selection (circle) to apply transformation to
         * @param categoryScale     - category scale object to use for positioning
         * @param valueScale        - value scale object to use for plotting by measure value
         * @param radius            - circle radius, in px
         * @param orientation       - orientation of category axis
         * @param show              - whether to show labels or not
         * @param shouldDimPoint    - helper method to apply styling for selection/highlighting
         * @param transitions       - existing array of transitions to add any new ones to
         */
            private transformDataLabel(
                selection: d3.Selection<SVGTextElement, IGroupDataPoint, any, any>,
                categoryScale: d3.ScaleBand<string>,
                valueScale: d3.ScaleLinear<number, number>,
                radius: number,
                orientation: AxisOrientation,
                show: boolean,
                shouldDimPoint: (dataPoint: VisualDataPoint) => boolean,
                transitions: Promise<void>[]
            ) {
                const midpoint = categoryScale.bandwidth() / 2;
                selection
                    .each((d, i, e) => {
                        const element = d3Select.select(e[i]);
                        transitions.push(
                            element
                                .classed('dimmed', shouldDimPoint(d))
                                .transition(ChartManager.HandleTransition())
                                    .attr('x', orientation === 'left'
                                                ?   valueScale(d.value)
                                                :   midpoint + radius
                                        )
                                    .attr('y', orientation === 'left'
                                                ?   midpoint - radius
                                                :   valueScale(d.value)
                                        )
                                .transition()
                                    .attr('text-anchor', orientation === 'left'
                                                ?   'middle'
                                                :   'start'
                                        )
                                    .attr('dominant-baseline', orientation === 'left'
                                                ?   'text-after-edge'
                                                :   'central'
                                        )
                                    .attr('fill', d.color)
                                    .text(d.name)
                                    .style('visibility', show ? 'visible' : 'hidden')
                                .end()
                        );
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