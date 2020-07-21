import { VisualSettings } from './settings';

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
        // Visual category data items
            categories: ICategory[];
        // Parsed visual settings
            settings: VisualSettings;
    }

/**
 * Create a view model of static data we can use to prototype our visual's look.
 *
 * @param settings  - pasrsed visual settings.
 */
    export function mapViewModel(settings: VisualSettings): IViewModel {
        return {
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