import type { ComponentType } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { View } from 'react-native'
import QRCode, { type QRCodeProps } from 'react-native-qrcode-svg'

export type MobileQrCardProps = {
  backgroundColor: string
  style: StyleProp<ViewStyle>
  value: string
}

const QRCodeComponent = QRCode as unknown as ComponentType<QRCodeProps>

export function MobileQrCard({ backgroundColor, style, value }: MobileQrCardProps) {
  if (!value) {
    return null
  }

  return (
    <View style={style}>
      <QRCodeComponent
        backgroundColor={backgroundColor}
        ecl='M'
        quietZone={8}
        size={154}
        value={value}
      />
    </View>
  )
}
