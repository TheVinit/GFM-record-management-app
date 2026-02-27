import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity, // Added
  View,
  ViewStyle // Added for style support
} from 'react-native';

// --- FormInput ---
interface FormInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  value: string;
  onChangeText?: (text: string) => void;
  containerStyle?: ViewStyle; // 👈 Added
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  value,
  onChangeText,
  editable = true,
  containerStyle, // 👈 Added
  ...props
}) => {
  const webId = Platform.OS === 'web'
    ? (props.nativeID ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    : undefined;

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          editable === false && styles.inputDisabled
        ]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        accessibilityLabel={label}
        nativeID={webId}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// --- FormPicker ---
interface FormPickerProps {
  label: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: string[] | { label: string; value: string }[];
  error?: string;
  enabled?: boolean;
  containerStyle?: ViewStyle;
  placeholder?: string;
}

export const FormPicker: React.FC<FormPickerProps> = ({
  label,
  selectedValue,
  onValueChange,
  items,
  error,
  enabled = true,
  containerStyle,
  placeholder
}) => {
  return (
    <View style={[styles.inputContainer, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.pickerContainer, error && styles.inputError]}>
        <Picker
          selectedValue={selectedValue}
          onValueChange={(value) => {
            if (value !== '' && value !== '__placeholder__') {
              onValueChange(value);
            }
          }}
          style={styles.picker}
          enabled={enabled}
        >
          {placeholder && (
            <Picker.Item
              key="__placeholder__"
              label={placeholder}
              value="__placeholder__"
              color="#999"
            />
          )}
          {items.map((item) => {
            const label = typeof item === 'string' ? item : item.label;
            const val = typeof item === 'string' ? item : item.value;
            return <Picker.Item key={val} label={label} value={val} />;
          })}
        </Picker>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// --- FormDatePicker ---
interface FormDatePickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  error?: string;
  editable?: boolean;
  containerStyle?: ViewStyle; // 👈 Added
}

export const FormDatePicker: React.FC<FormDatePickerProps> = ({
  label,
  value,
  onChange,
  error,
  editable = true,
  containerStyle
}) => {
  const [show, setShow] = React.useState(false);

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Select Date';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShow(Platform.OS === 'ios');
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${year}-${month}-${day}`);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.inputContainer, containerStyle]}>
        <Text style={styles.label}>{label}</Text>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={!editable}
          style={{
            border: `1px solid ${error ? '#f44336' : '#ddd'}`,
            borderRadius: '8px',
            padding: '12px',
            fontSize: '16px',
            backgroundColor: '#fff',
            color: '#333',
            width: '100%',
            boxSizing: 'border-box',
            outline: 'none'
          }}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.inputContainer, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        onPress={() => editable && setShow(true)}
        style={[
          styles.input,
          error && styles.inputError,
          !editable && styles.inputDisabled
        ]}
      >
        <Text style={{ color: value ? '#333' : '#999' }}>
          {value ? formatDate(value) : 'Select Date'}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333'
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 2
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden'
  },
  picker: {
    height: Platform.OS === 'ios' ? 180 : 50
  },
  datePreview: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic'
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4
  }
});