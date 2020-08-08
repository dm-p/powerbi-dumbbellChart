import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;

import { VisualSettings } from './settings';

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

    }

/**
 * Properties specific to the category axis.
 */
    interface ICategoryAxis extends IAxis {

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
    interface IGroup {
        // Name of group
            name: string;
        // Data point value
            value: number;
    }

/**
 * Represents a visual category data item.
 */
    interface ICategory {
        // Name of category
            name: string;
        // Category group items
            groups: IGroup[];
    }

/**
 * Visual view model.
 */
    interface IViewModel {
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
    }

/**
 * Create a view model of static data we can use to prototype our visual's look.
 *
 * @param settings  - parsed visual settings.
 */
    export function mapViewModel(settings: VisualSettings, viewport: IViewport): IViewModel {

        // Assign our margin values so we can re-use them more easily
            const margin = {
                top: 10,
                right: 10,
                bottom: 25,
                left: 75
            };
        
        // View model
            return {
                margin: margin,
                categoryAxis: {
                    range:[
                        margin.top,
                        viewport.height - margin.bottom
                    ],
                    translate: {
                        x: margin.left,
                        y: 0
                    }
                },
                valueAxis: {
                    range: [
                        margin.left,
                        viewport.width - margin.right
                    ],
                    translate: {
                        x: 0,
                        y: viewport.height - margin.bottom
                    }
                },
                categories: [
                    {
                        name: 'Category A',
                        groups: [
                            { name: 'Group One', value: 6 },
                            { name: 'Group Two', value: 14 }
                        ]
                    },
                    {
                        name: 'Category B',
                        groups: [
                            { name: 'Group One', value: 6 },
                            { name: 'Group Two', value: 14 }
                        ]
                    },
                    {
                        name: 'Category C',
                        groups: [
                            { name: 'Group One', value: 20 },
                            { name: 'Group Two', value: 12 }
                        ]
                    },
                    {
                        name: 'Category D',
                        groups: [
                            { name: 'Group One', value: 18 },
                            { name: 'Group Two', value: 7 }
                        ]
                    }
                ],
                settings: settings
            }
    }