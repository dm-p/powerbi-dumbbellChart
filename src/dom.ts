import powerbi from 'powerbi-visuals-api';
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import { ChartManager } from './chart';
import { LandingPageManager } from './landing';

    export class DomManager {

        // Used to handle the chart portion of the visual
            chartManager: ChartManager;
        // Used to handle the landing page content
            landingPageManager: LandingPageManager;

        // Main visual element
            private element: HTMLElement;

            constructor(element: HTMLElement, host: IVisualHost) {
                    this.element = element;
                // Add a landing page to our main element
                    this.landingPageManager = new LandingPageManager(this.element, host);
                // Add our chart container after the landing page
                    this.chartManager = new ChartManager(this.element);

            }

    }