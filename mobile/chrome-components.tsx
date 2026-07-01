import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { Text, View } from 'react-native'
import { CameraView, type BarcodeScanningResult } from 'expo-camera'
import { QrCode, Sprout } from 'lucide-react-native'
import {
  MobileScannerCancelButton,
  type MobileScannerCancelButtonStyles
} from './action-components.js'
import { MobileQrCard } from './qr-components.js'

export type HeaderStyles = {
  brandRow: StyleProp<ViewStyle>
  header: StyleProp<ViewStyle>
  homeStatusPill: StyleProp<ViewStyle>
  kicker: StyleProp<TextStyle>
  mark: StyleProp<ViewStyle>
  mobileStatusStrip: StyleProp<ViewStyle>
  notice: StyleProp<TextStyle>
  statusDot: StyleProp<ViewStyle>
  statusText: StyleProp<TextStyle>
  title: StyleProp<TextStyle>
  treeholeStatusPill: StyleProp<ViewStyle>
  treeholeStatusText: StyleProp<TextStyle>
}

export type HeaderTheme = {
  accentStrong: string
}

export type HeaderProps = {
  notice: string
  statusLabel: string
  styles: HeaderStyles
  theme: HeaderTheme
  title: string
  treeholeStatusLabel: string
}

export function Header({
  notice,
  statusLabel,
  styles,
  theme,
  title,
  treeholeStatusLabel
}: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.mark}>
          <Sprout color={theme.accentStrong} size={22} strokeWidth={2.4} />
        </View>
        <View>
          <Text style={styles.kicker}>private garden</Text>
          <Text style={styles.title} testID={title === 'Home' ? 'home-title' : 'lobby-title'}>
            {title}
          </Text>
        </View>
      </View>
      <View accessibilityLabel='Current status' style={styles.mobileStatusStrip}>
        <View style={styles.homeStatusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
        <View style={styles.treeholeStatusPill}>
          <Text style={styles.treeholeStatusText}>{treeholeStatusLabel}</Text>
        </View>
      </View>
      <Text accessibilityLiveRegion='polite' style={styles.notice} testID='app-notice'>
        {notice}
      </Text>
    </View>
  )
}

export type QrCardProps = {
  backgroundColor: string
  styles: {
    qrCard: StyleProp<ViewStyle>
  }
  value: string
}

export function QrCard({ backgroundColor, styles, value }: QrCardProps) {
  return <MobileQrCard backgroundColor={backgroundColor} style={styles.qrCard} value={value} />
}

export type QrScannerStyles = MobileScannerCancelButtonStyles & {
  scannerCamera: StyleProp<ViewStyle>
  scannerControls: StyleProp<ViewStyle>
  scannerOverlay: StyleProp<ViewStyle>
  scannerPermission: StyleProp<ViewStyle>
  scannerPermissionCopy: StyleProp<TextStyle>
  scannerPermissionTitle: StyleProp<TextStyle>
}

export type QrScannerTheme = {
  accentStrong: string
}

export type QrScannerProps = {
  onCancel(): void
  onScanned(result: BarcodeScanningResult): void
  permissionDenied: boolean
  styles: QrScannerStyles
  theme: QrScannerTheme
}

export function QrScanner({
  onCancel,
  onScanned,
  permissionDenied,
  styles,
  theme
}: QrScannerProps) {
  return (
    <View style={styles.scannerOverlay} testID='qr-scanner-overlay'>
      {permissionDenied ? (
        <View style={styles.scannerPermission} testID='qr-scanner-permission'>
          <QrCode color={theme.accentStrong} size={42} />
          <Text style={styles.scannerPermissionTitle}>Camera access is off.</Text>
          <Text style={styles.scannerPermissionCopy}>
            Enable camera permission to scan QR codes.
          </Text>
        </View>
      ) : (
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onScanned}
          style={styles.scannerCamera}
          testID='qr-scanner-camera'
        />
      )}
      <View style={styles.scannerControls}>
        <MobileScannerCancelButton onPress={onCancel} styles={styles} />
      </View>
    </View>
  )
}
