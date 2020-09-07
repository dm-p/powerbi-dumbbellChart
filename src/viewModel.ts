import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import DataView = powerbi.DataView;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionId = powerbi.visuals.ISelectionId;
import { dataViewObject } from 'powerbi-visuals-utils-dataviewutils';
import getFillColorByPropertyName = dataViewObject.getFillColorByPropertyName;

import { VisualSettings } from './settings';

import * as d3Scale from 'd3-scale';

/**
 * Shared axis properties.
 */
    interface IAxis {
        // Physical range of the axis (start and end)
            range: [number, number];
        // X/Y coordinates for SVG translation of enclosing group
            translate: ICoordinates;
    }

/**
 * Properties specific to the value axis.
 */
    interface IValueAxis extends IAxis {
        // Axis domain values
            domain: [number, number];
        // Scale to generate axis from domain and range
            scale: d3Scale.ScaleLinear<number, number>;
        // Tick count (number of ticks to apply)
            tickCount: number;
        // Tick size (length of each gridline)
            tickSize: number;
    }

/**
 * Properties specific to the category axis.
 */
    interface ICategoryAxis extends IAxis {
        // Category domain values
            domain: string[];
        // Scale to generate axis from domain and range
            scale: d3Scale.ScaleBand<string>;
    }

/**
 * Generic interface we can use to store x/y coordinates.
 */
    interface ICoordinates {
        x: number;
        y: number;
    }

/**
 * Used to specify the visual margin values.
 */
    interface IMargin {
        // Pixels to leave at the top
            top: number;
        // Pixels to leave to the right
            right: number;
        // Pixels to leave at the bottom
            bottom: number;
        // Pixels to leave to the left
            left: number;
    }

/**
 * Represents a data point within a visual category.
 */
    export interface IGroup {
        // Name of group
            name: string;
        // Group selection ID (for unique values of series)
            groupSelectionId: ISelectionId;
        // Data point selection ID (intersection of category/series/measure)
            dataPointSelectionId: ISelectionId;
        // Data point value
            value: number;
        // Data point color
            color: string;
    }

/**
 * Represents a visual category data item.
 */
    export interface ICategory {
        // Name of category
            name: string;
        // Maximum group value
            max: number;
        // Minimum group value
            min: number;
        // Category selection ID
            selectionId: ISelectionId;
        // Category group items
            groups: IGroup[];
    }

/**
 * Visual view model.
 */
    export interface IViewModel {
        // Indicates that visual is safe to render
            isValid: boolean;
        // Visual margin values
            margin: IMargin;
        // Visual category data items
            categories: ICategory[];
        // Parsed visual settings
            settings: VisualSettings;
        // Category axis information
            categoryAxis: ICategoryAxis;
        // Value axis information
            valueAxis: IValueAxis;
        // Minimum value for our measure axis
            minValue: number;
        // Maximum value for our measure axis
            maxValue: number;
    }

/**
 * Used to maintain the state of the visual ViewModel
 */
    export class ViewModelManager {
        
        // Visual viewModel
            viewModel: IViewModel = this.getNewViewModel();
        // Visual host services
            private host: IVisualHost;

            constructor(host: IVisualHost) {
                this.host = host;
            }

        /**
         * For a supplied dataView and settings, map the data from it into the ViewModel.
         * 
         * @param dataView  - dataView from update options
         * @param settings  - parsed visual settings
         */
            mapDataView(dataView: DataView, settings: VisualSettings) {
                // Declare empty viewModel
                    const viewModel = this.getNewViewModel(settings);
                // For safety's sake, handle the situation where we might not have validated beforehand, so
                // that any calling function gets an empty view model and can fail gracefully.
                    viewModel.isValid = this.viewModel.isValid = this.isDataViewValid(dataView);
                    if (!viewModel.isValid) return;
                // We need to get the min/max extents of all values in the supplied data. We'll instantiate two variables
                // here to track this and as we encounter values, we can replace them with new values if they fall outside
                // the current ranges. These are undefined so that we can deal with minimum values in the data that are 
                // over zero.
                    let datasetMinValue: number,
                        datasetMaxValue: number;
                // Obtain the category column metadata (incl. data values)
                    const categoryColumn =  dataView.categorical.categories[0];
                // Obtain the value groupings (incl. all values)
                    const valueGroupings = dataView.categorical.values;
                // Traverse the data view and map.
                // For each category value, we can use its index to access its corresponding value in each array of values
                // in each categorical.values grouping and bring it in.
                // We could do this more optimially but breaking into steps for learning purposes.
                    categoryColumn.values.forEach((cv, ci) => {
                            // Category name from current array value. The type is a powerbi.PrimitiveValue, which needs to
                            // be cast to string to fit our view model spec.
                                const categoryName = <string>cv;
                            // We need to get the min/max extents of the group values for the category, so we can track this
                            // using variables in this part of the mapping process and will reset when we hit the next category.
                                let categoryMinValue: number,
                                    categoryMaxValue: number;
                            // Build our Selection ID for this category
                                const categorySelectionId = this.host.createSelectionIdBuilder()
                                        .withCategory(categoryColumn, ci)
                                        .createSelectionId();
                            // The number of entries in the categorical.values array denotes how many groups we have in each
                            // category, so we can iterate over these too and use the category index from the outer foreach
                            // to access the correct measure value from each group's values array.
                                const groups: IGroup[] = valueGroupings.grouped().map((g, gi) => {
                                    // Get our measure column (which is the first values array element)
                                        const measure = g.values.find((m) => m.source.roles.measure);
                                    // Get group name
                                        const groupName = <string>g.name;
                                    // Series-level selection ID
                                        const groupSelectionId = this.host.createSelectionIdBuilder()
                                                .withSeries(valueGroupings, g)
                                                .createSelectionId();
                                    // Data point-level selection ID
                                        const dataPointSelectionId = this.host.createSelectionIdBuilder()
                                                .withCategory(categoryColumn, ci)
                                                .withSeries(valueGroupings, g)
                                                .withMeasure(measure.source.queryName)
                                                .createSelectionId();
                                    // Get current value. Similar to category, it needs to be type-cast. As we have restricted
                                    // valid data types in our data roles, we know it's safe to cast it to a number.
                                        const groupValue = <number>measure.values[ci];
                                    // Set group min/max to measure value if it's at the extremes
                                        categoryMinValue = Math.min(categoryMinValue || groupValue, groupValue);
                                        categoryMaxValue = Math.max(categoryMaxValue || groupValue, groupValue);
                                    // Handle colour selection. Look in the grouped objects, or using the host services to access 
                                    // the report's color palette and assign a color by name. This will use the next available color
                                    // if not already used, which means that when a group name is re-encountered on subsequent
                                    // categories, Power BI will assign the already reserved color code.
                                        const color = getFillColorByPropertyName(
                                            g.objects?.dataPoints,
                                            'fillColor',
                                            this.host.colorPalette.getColor(groupName).value
                                        );
                                    // Return a valid IGroup for this iteration.
                                        return {
                                            name: groupName,
                                            groupSelectionId: groupSelectionId,
                                            dataPointSelectionId: dataPointSelectionId,
                                            value: groupValue,
                                            color: color
                                        }
                                });
                        // Resolve dataset min/max based on discovered group min/max
                            datasetMinValue = Math.min(datasetMinValue || categoryMinValue, categoryMinValue);
                            datasetMaxValue = Math.max(datasetMaxValue || categoryMaxValue, categoryMaxValue);
                        // Push the category object into the view model's categories array with the correct properties.
                            viewModel.categories.push({
                                name: categoryName,
                                groups: groups,
                                min: categoryMinValue,
                                max: categoryMaxValue,
                                selectionId: categorySelectionId
                            });
                    });
                // Update the dataset min and max values
                    viewModel.minValue = datasetMinValue;
                    viewModel.maxValue = datasetMaxValue;
                // Assign new viewModel
                    this.viewModel = viewModel;
            }

        /**
         * For the supplied visual viewport, work out the visual's individual axes for the ViewModel.
         *
         * @param viewport  - viewport (width/height) to constrain visual to
         */
            updateAxes(viewport: IViewport) {
                // Assign our margin values so we can re-use them more easily
                    this.viewModel.margin.bottom = 25;
                    this.viewModel.margin.left = 130;
                    this.viewModel.margin.right = 30;
                    const margin = this.viewModel.margin;
                // Value axis domain (min/max)
                    const valueAxisDomain: [number, number] = [this.viewModel.minValue, this.viewModel.maxValue];
                // Category axis domain (unique values)
                    const categoryAxisDomain = this.viewModel.categories.map((c) => c.name);
                // Derived range for the value axis, based on margin values
                    const valueAxisRange: [number, number] = [
                        margin.left,
                        viewport.width - margin.right
                    ];
                // Derived range for the category axis, based on margin values
                    const categoryAxisRange: [number, number] = [
                        margin.top,
                        viewport.height - margin.bottom
                    ];
                // Tick count for value axis
                    const valueAxisTickCount = 3;
                // Set-up category axis
                    this.viewModel.categoryAxis = {
                        range: categoryAxisRange,
                        domain: categoryAxisDomain,
                        scale: d3Scale.scaleBand()
                            .domain(categoryAxisDomain)
                            .range(categoryAxisRange)
                            .padding(0.2),
                        translate: {
                            x: margin.left,
                            y: 0
                        }
                    };
                // Set-up value axis
                    this.viewModel.valueAxis = {
                        range: valueAxisRange,
                        domain: valueAxisDomain,
                        scale: d3Scale.scaleLinear()
                            .domain(valueAxisDomain)
                            .range(valueAxisRange)
                            .nice(valueAxisTickCount),
                        translate: {
                            x: 0,
                            y: viewport.height - margin.bottom
                        },
                        tickCount: valueAxisTickCount,
                        tickSize: - viewport.height - margin.top - margin.bottom
                    };
            }

        /**
         * Creates an 'empty' viewModel, essentially resetting it.
         *
         * @param settings  - parsed visual settings
         */
            private getNewViewModel(settings?: VisualSettings): IViewModel {
                return {
                    isValid: false,
                    margin: {
                        top: 10,
                        right: 10,
                        bottom: 10,
                        left: 10
                    },
                    categories: [],
                    settings: settings,
                    categoryAxis: null,
                    valueAxis: null,
                    minValue: 0,
                    maxValue: 0
                }
            }

        /**
         * Test the supplied data view to ensure that it's valid for our visual's view model logic.
         *
         * @param dataView  - dataView from update options
         */
            private isDataViewValid(dataView: DataView): boolean {
                if (
                    dataView &&
                    dataView.categorical &&
                    dataView.categorical.categories &&
                    dataView.categorical.categories.length === 1 &&
                    dataView.categorical.values &&
                    dataView.categorical.values.length > 0
                ) {
                    return true;
                }
                return false;
            }
    }