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

import { VisualSettings } from './settings';
import { mapViewModel } from './viewModel';

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
            const viewModel = mapViewModel(this.settings);
        
        // Inspect the view model in the browser console
            console.log(viewModel);
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