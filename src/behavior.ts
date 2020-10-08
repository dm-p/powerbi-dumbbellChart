import { interactivitySelectionService, interactivityBaseService, interactivityUtils } from 'powerbi-visuals-utils-interactivityutils';
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import IBehaviorOptions = interactivityBaseService.IBehaviorOptions;
import BaseDataPoint = interactivityBaseService.BaseDataPoint;
import IInteractiveBehavior = interactivityBaseService.IInteractiveBehavior;
import ISelectionHandler = interactivityBaseService.ISelectionHandler;
import getEvent = interactivityUtils.getEvent;

import { ICategory, IGroupDataPoint, IGroupBase, IViewModel } from './viewModel';

/**
 * Behavior options for interactivity.
 */
    export interface IDumbbellBehaviorOptions<SelectableDataPoint extends BaseDataPoint> extends IBehaviorOptions<SelectableDataPoint> {
        // Elements denoting a selectable category in the visual
            categorySelection: d3.Selection<any, ICategory, any, any>;
        // Elements denoting a selectable data point in the visual
            pointSelection: d3.Selection<SVGCircleElement, IGroupDataPoint, any, ICategory>;
        // Elements denotic a selectable data label in the visual
            dataLabelSelection: d3.Selection<SVGTextElement, IGroupBase, any, any>;
        // Elements denoting a selectable category label in the visual
            categoryLabelSelection: d3.Selection<SVGTextElement, ICategory, any, any>;
        // Element performing the role of clear-catcher (clears selection)
            clearCatcherSelection: d3.Selection<SVGRectElement, any, any, any>;
        // Visual ViewModel
            viewModel: IViewModel;
    }

/**
 * Used to control and bind visual interaction and behavior.
 */
    export class BehaviorManager<SelectableDataPoint extends BaseDataPoint> implements IInteractiveBehavior {
        // Interactivity options
            protected options: IDumbbellBehaviorOptions<SelectableDataPoint>;
        // Handles selection event delegation to the visual host
            protected selectionHandler: ISelectionHandler;

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
         * Apply context menu behavior to selections as necessary.
         */
            protected bindContextMenu() {
                const {
                    categorySelection,
                    categoryLabelSelection,
                    pointSelection,
                    dataLabelSelection,
                    clearCatcherSelection
                } = this.options;
                categorySelection.on('contextmenu', (d) => this.handleContextMenu(d));
                categoryLabelSelection.on('contextmenu', (d) => this.handleContextMenu(d));
                pointSelection.on('contextmenu', (d) => this.handleContextMenu(d));
                dataLabelSelection.on('contextmenu', (d) => this.handleContextMenu(d));
                clearCatcherSelection.on('contextmenu', () => this.handleContextMenu(null));
            }

        /**
         * Abstraction of common click event handling for a `SelectableDataPoint`
         *
         * @param d     - datum from selection
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
         * Abstraction of common context menu event handling for a `SelectableDataPoint`.
         *
         * @param d     - datum from selection
         */
            handleContextMenu(
                d: ICategory | IGroupBase
            ) {
                const mouseEvent: MouseEvent = getEvent() as MouseEvent || window.event as MouseEvent;
                mouseEvent.preventDefault();
                mouseEvent && this.selectionHandler.handleContextMenu(
                    d,
                    {
                        x: mouseEvent.clientX,
                        y: mouseEvent.clientY
                    }
                );
            }

        /**
         * Apply click behavior to the clear-catcher (clearing active selections if clicked).
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
                this.bindContextMenu();
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
                    dataLabelSelection,
                    viewModel
                } = this.options;
                // Update viewModel selection state to match current state
                    viewModel.hasSelection = hasSelection;
                categorySelection
                    .classed('dimmed', (d) => viewModel.shouldDimPoint(d));
                categoryLabelSelection
                    .classed('emphasized', (d) => viewModel.shouldEmphasizePoint(d));
                pointSelection
                    .classed('dimmed', (d) => viewModel.shouldDimPoint(d));
                dataLabelSelection
                    .classed('dimmed', (d) => viewModel.shouldDimPoint(d));
            }
    }