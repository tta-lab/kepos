import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { Text, TextInput, View } from 'react-native'

export type FieldStyles = {
  field: StyleProp<ViewStyle>
  input: StyleProp<TextStyle>
  label: StyleProp<TextStyle>
}

export type FieldProps = {
  label: string
  onChangeText(value: string): void
  styles: FieldStyles
  testID?: string
  value?: string
}

export function Field({ label, onChangeText, styles, testID, value }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize='none'
        autoCorrect={false}
        onChangeText={onChangeText}
        style={styles.input}
        testID={testID}
        value={value}
      />
    </View>
  )
}
