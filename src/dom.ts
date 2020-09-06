import { ChartManager } from './chart';

    export class DomManager {

        // Used to handle the chart portion of the visual
            chartManager: ChartManager;

        // Main visual element
            private element: HTMLElement;

            constructor(element: HTMLElement) {
                    this.element = element;
                // At the moment, the chart is the only component of the visual, so we will pass through the
                // main element
                    this.chartManager = new ChartManager(this.element);

            }

    }