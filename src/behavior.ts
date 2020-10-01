import { interactivitySelectionService, interactivityBaseService, interactivityUtils } from 'powerbi-visuals-utils-interactivityutils';
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import IBehaviorOptions = interactivityBaseService.IBehaviorOptions;
import BaseDataPoint = interactivityBaseService.BaseDataPoint;
import IInteractiveBehavior = interactivityBaseService.IInteractiveBehavior;
import ISelectionHandler = interactivityBaseService.ISelectionHandler;
import getEvent = interactivityUtils.getEvent;

import { ICategory, IGroup, IGroupBase } from './viewModel';

/**
 * Behavior options for interactivity.
 */
    export interface IDumbbellBehaviorOptions<SelectableDataPoint extends BaseDataPoint> extends IBehaviorOptions<SelectableDataPoint> {
        // Elements denoting a selectable category in the visual
            categorySelection: d3.Selection<any, ICategory, any, any>;
        // Elements denoting a selectable data point in the visual
            pointSelection: d3.Selection<SVGCircleElement, IGroup, any, ICategory>;
        // Elements denotic a selectable data label in the visual
            dataLabelSelection: d3.Selection<SVGTextElement, IGroupBase, any, any>;
        // Elements denoting a selectable category label in the visual
            categoryLabelSelection: d3.Selection<SVGTextElement, ICategory, any, any>;
        // Element performing the role of clear-catcher (clears selection)
            clearCatcherSelection: d3.Selection<SVGRectElement, any, any, any>;
    }

/**
 * Used to control and bind visual interaction and behavior.
 */
    export class BehaviorManager<SelectableDataPoint extends BaseDataPoint> implements IInteractiveBehavior {
        // Interactivity options
            protected options: IDumbbellBehaviorOptions<SelectableDataPoint>;
        // Handles selection event delegation to the visual host
            protected selectionHandler: ISelectionHandler;
        // How much opacity to apply to non-selected data points
            private static DimmedOpacity: number = 0.4;
        // How much opacity to apply to selected data points
            private static DefaultOpacity: number = 1;
        // Standard font weight for elements that we will embolden upon selection
            private static NormalFontWeight: string = 'normal';
        // Bold font weight for elements that we will embolden upon selection
            private static BoldFontWeight: string = 'bold';

        /**
         * Determine the opacity for a data point, based on selection state within the visual.
         *
         * @param selected      - data point selection state
         * @param hasSelection  - visual selection state
         */
            private getFillOpacity(
                selected: boolean,
                hasSelection: boolean
            ) {
                if (hasSelection && !selected) {
                    return BehaviorManager.DimmedOpacity;
                }
                return BehaviorManager.DefaultOpacity;
            }

        /**
         * Determine if an element should be emboldened or not, based on selection state within the visual.
         *
         * @param selected      - data point selection state
         */
            private getFontWeight(
                selected: boolean
            ) {
                if (selected) {
                    return BehaviorManager.BoldFontWeight;
                }
                return BehaviorManager.NormalFontWeight;
            }

        /**
         * Apply click behavior to selections as necessary.
         */
            protected bindClick() {
                const {
                    categorySelection,
                    categoryLabelSelection,
                    pointSelection,
                    dataLabelSelection
                } = this.options;
                categorySelection.on('click', (d) => this.handleSelectionClick(d));
                categoryLabelSelection.on('click', (d) => this.handleSelectionClick(d));
                pointSelection.on('click', (d) => this.handleSelectionClick(d));
                dataLabelSelection.on('click', (d) => this.handleSelectionClick(d));
            }

        /**
         * Abstraction of common click event handling for a `SelectableDataPoint`
         * @param d 
         */
            private handleSelectionClick(
                d: ICategory | IGroupBase
            ) {
                const mouseEvent: MouseEvent = getEvent() as MouseEvent || window.event as MouseEvent;
                mouseEvent && this.selectionHandler.handleSelection(
                    d,
                    mouseEvent.ctrlKey
                );
            }

        /**
         * Apply click behaviour to the clear-catcher (clearing active selections if clicked).
         */
            protected bindClearCatcher() {
                const {
                    clearCatcherSelection
                } = this.options;
                clearCatcherSelection.on('click', () => {
                    const mouseEvent: MouseEvent = getEvent() as MouseEvent || window.event as MouseEvent;
                    mouseEvent && this.selectionHandler.handleClearSelection();
                });
            }

        /**
         * Ensure that class has necessary options and tooling to perform interactivity/behavior requirements as needed.
         * 
         * @param options           - interactivity & behavior options
         * @param selectionHandler  - selection handler instance
         */
            public bindEvents(
                options: IDumbbellBehaviorOptions<SelectableDataPoint>,
                selectionHandler: ISelectionHandler
            ): void {
                this.options = options;
                this.selectionHandler = selectionHandler;
                this.bindClick();
                this.bindClearCatcher();
            }

        /**
         * Handle visual effects on selection and interactivity events.
         *
         * @param hasSelection - whether visual has selection state or not
         */
            public renderSelection(hasSelection: boolean): void {
                const {
                    categorySelection,
                    categoryLabelSelection,
                    pointSelection,
                    dataLabelSelection
                } = this.options;
                categorySelection
                    .style('opacity', (d) => this.getFillOpacity(d.selected, hasSelection));
                categoryLabelSelection
                    .style('font-weight', (d) => this.getFontWeight(d.selected));
                pointSelection
                    .style('opacity', (d) => this.getFillOpacity(d.selected, hasSelection));
                dataLabelSelection
                    .style('opacity', (d) => this.getFillOpacity(d.selected, hasSelection));
            }
    }