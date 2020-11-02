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
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualUpdateType = powerbi.VisualUpdateType;
import IVisualEventService = powerbi.extensibility.IVisualEventService;

import { interactivitySelectionService, interactivityBaseService } from 'powerbi-visuals-utils-interactivityutils';
import IInteractivityService = interactivityBaseService.IInteractivityService;
import SelectableDataPoint = interactivitySelectionService.SelectableDataPoint;

import { ITooltipServiceWrapper, createTooltipServiceWrapper, TooltipEventArgs } from 'powerbi-visuals-utils-tooltiputils';

import { VisualSettings } from './settings';
import { IGroupDataPoint, ViewModelManager } from './viewModel';
import { DomManager } from './dom';
import { BehaviorManager, IDumbbellBehaviorOptions } from './behavior';

export class Visual implements IVisual {
    // Visual's main (root) element
        private target: HTMLElement;
    // Parsed visual settings
        private settings: VisualSettings;
    // Developer visual host services
        private host: IVisualHost;
    // ViewModel manager for visual
        private viewModelManager: ViewModelManager;
    // Main DOM manager
        private domManager: DomManager;
    // Interactivity for data points
        private interactivity: IInteractivityService<SelectableDataPoint>;
    // Behavior of data points
        private behavior: BehaviorManager<SelectableDataPoint>;
    // Handling of tooltip display
        private tooltipServiceWrapper: ITooltipServiceWrapper;
    // Visual events service
        private events: IVisualEventService;

    constructor(options: VisualConstructorOptions) {
        console.log('Visual constructor', options);
        this.target = options.element;
        this.host = options.host;
        this.viewModelManager = new ViewModelManager(this.host);
        this.domManager = new DomManager(this.target);
        this.interactivity = interactivitySelectionService.createInteractivitySelectionService(this.host);
        this.behavior = new BehaviorManager();
        this.tooltipServiceWrapper = createTooltipServiceWrapper(
            this.host.tooltipService,
            this.target
        );
        this.events = this.host.eventService;
    }

    public update(options: VisualUpdateOptions) {
        console.log('Visual update', options);
        try {
            // Signal rendering has begun
                this.events.renderingStarted(options);
            // Declare data view for re-use
                const dataView = options && options.dataViews && options.dataViews[0];
            // Parse data view into settings
                this.settings = Visual.parseSettings(dataView);
            // We don't need to (re) map the view model unless the visual's data changes. The visual update options tell us the type
            // of update that's going on and we can decide if we need to do it or not.
                switch (options.type) {
                    case VisualUpdateType.All:
                    case VisualUpdateType.Data: {
                        console.log('dataView has changed! Mapping ViewModel...');
                        this.viewModelManager.mapDataView(dataView, this.settings);
                        break;
                    }
                }
            // More convenient access to viewModel
                const viewModel = this.viewModelManager.viewModel;
            // More conventient access to DOM Manager's Chart Manager instance
                const chartManager = this.domManager.chartManager;
            // The options.viewport object gives us the current visual's size, so we can assign this to
            // our chart container to allow it to grow and shrink.
                chartManager.updateViewport(options.viewport);
            // Ensure our visual responds appropriately for the user if the data view isn't valid
                if (!viewModel.isValid) {
                    chartManager.clear();
                    // Signal rendering has finished
                        this.events.renderingFinished(options);
                } else {
                    // Ensure we've updated our viewmodel's axes based on any new viewport info
                        this.viewModelManager.updateAxes(options.viewport);
                    // Re-draw the chart
                        chartManager.plot(viewModel, this.events, options);
                    // Update interactivity/behavior
                        this.interactivity.bind(<IDumbbellBehaviorOptions<SelectableDataPoint>>{
                            behavior: this.behavior,
                            dataPoints: this.viewModelManager.getSelectableDataPoints(),
                            categorySelection: chartManager.categories,
                            categoryLabelSelection: chartManager.categoryLabels,
                            pointSelection: chartManager.points,
                            dataLabelSelection: chartManager.dataLabels,
                            clearCatcherSelection: chartManager.clearCatcherContainer,
                            viewModel: this.viewModelManager.viewModel
                        });
                    // Bind tooltip display
                        this.tooltipServiceWrapper.addTooltip(
                            chartManager.points,
                            (tte: TooltipEventArgs<IGroupDataPoint>) => tte.data.tooltipData,
                            (tte: TooltipEventArgs<IGroupDataPoint>) => tte.data.dataPointSelectionId
                        );
                }
        } catch(e) {
            // Signal rendering failure
                this.events.renderingFailed(options);
            // (For now) log error details and pause execution for debugging
                console.log('Error!', e);
                debugger;
        } finally {
            // Inspect the view model in the browser console
                console.log(this.viewModelManager.viewModel);
        }
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
        let objects = <VisualObjectInstanceEnumerationObject>
                VisualSettings.enumerateObjectInstances(
                    this.settings || VisualSettings.getDefault(),
                    options
                );
        // Show which object this call is processing
            console.log(`Object: ${options.objectName}`);
        // Based on which object we're working with, handle the instances accordingly
            switch (options.objectName) {
                case 'categoryAxis': {
                    // Add valid ranges for categoryAxis
                        objects.instances[0].validValues = {
                            innerPadding: {
                                numberRange: {
                                    min: 0,
                                    max: 50
                                }
                            }
                        }
                    // Remove inner padding if using left orientation
                        if (this.settings.categoryAxis.orientation === 'left') {
                            delete objects.instances[0].properties.innerPadding;
                        }
                    break;
                }
                case 'valueAxis': {
                    // Add valid ranges for valueAxis
                        objects.instances[0].validValues = {
                            decimalPlaces: {
                                numberRange: {
                                    min: 0,
                                    max: 5
                                }
                            }
                        }
                    break;
                }
                case 'dataPoints': {
                    // Add valid ranges for data points
                        objects.instances[0].validValues = {
                            radius: {
                                numberRange: {
                                    min: 2,
                                    max: 10
                                }
                            }
                        }
                    // Create a new instance for each group/series and add data-bound properties
                        this.viewModelManager.viewModel.groups.forEach((g) => {
                            objects.instances.push({
                                objectName: options.objectName,
                                displayName: g.name,
                                properties: {
                                    fillColor: {
                                        solid: {
                                            color: g.color
                                        }
                                    }
                                },
                                selector: g.groupSelectionId.getSelector()
                            });
                        });
                }
            }
        // Show our instances
            console.log(objects.instances);
        return objects;
    }
}