declare module '@react-native-picker/picker' {
    import { Component } from 'react';
    import { StyleProp, TextStyle, ViewProps } from 'react-native';

    export interface PickerItemProps {
        label: string;
        value: any;
        color?: string;
        testID?: string;
    }

    export class PickerItem extends Component<PickerItemProps> { }

    export interface PickerProps extends ViewProps {
        selectedValue?: any;
        onValueChange?: (itemValue: any, itemIndex: number) => void;
        enabled?: boolean;
        mode?: 'dialog' | 'dropdown';
        itemStyle?: StyleProp<TextStyle>;
        prompt?: string;
    }

    export class Picker extends Component<PickerProps> {
        static Item: typeof PickerItem;
    }
}
