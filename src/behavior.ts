import { interactivitySelectionService, interactivityBaseService, interactivityUtils } from 'powerbi-visuals-utils-interactivityutils';
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;
import IBehaviorOptions = interactivityBaseService.IBehaviorOptions;
import BaseDataPoint = interactivityBaseService.BaseDataPoint;
import IInteractiveBehavior = interactivityBaseService.IInteractiveBehavior;
import ISelectionHandler = interactivityBaseService.ISelectionHandler;
import getEvent = interactivityUtils.getEvent;

import { ICategory } from './viewModel';

/**
 * Behavior options for interactivity.
 */
    export interface IDumbbellBehaviorOptions<SelectableDataPoint extends BaseDataPoint> extends IBehaviorOptions<SelectableDataPoint> {
        categorySelection: d3.Selection<any, ICategory, any, any>;
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
                    categorySelection
                } = this.options;
                categorySelection.on('click', (d) => {
                    const mouseEvent: MouseEvent = getEvent() as MouseEvent || window.event as MouseEvent;
                    mouseEvent && this.selectionHandler.handleSelection(
                        d,
                        mouseEvent.ctrlKey
                    );
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
            }

        /**
         * Handle visual effects on selection and interactivity events.
         *
         * @param hasSelection - whether visual has selection state or not
         */
            public renderSelection(hasSelection: boolean): void {
                // TODO: handling
            }
    }