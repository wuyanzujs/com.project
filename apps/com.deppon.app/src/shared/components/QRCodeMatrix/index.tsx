import { Text, View } from '@tarojs/components'

import { useMemo } from 'react'

import QRCode from 'qrcode'

import './index.scss'

type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

export interface QRCodeMatrixProps {
  value: string
  size?: number
  darkColor?: string
  lightColor?: string
  errorCorrectionLevel?: QRErrorCorrectionLevel
}

interface QRModules {
  size: number
  get: (column: number, row: number) => boolean | number
}

function createMatrix(
  value: string,
  errorCorrectionLevel: QRErrorCorrectionLevel
) {
  const qrCode = QRCode.create(value, {
    errorCorrectionLevel
  })
  const modules = qrCode.modules as unknown as QRModules

  return Array.from({ length: modules.size }, (_rowItem, rowIndex) =>
    Array.from({ length: modules.size }, (_columnItem, columnIndex) =>
      Boolean(modules.get(columnIndex, rowIndex))
    )
  )
}

const QRCodeMatrix = ({
  value,
  size = 300,
  darkColor = '#101828',
  lightColor = '#ffffff',
  errorCorrectionLevel = 'M'
}: QRCodeMatrixProps) => {
  const normalizedValue = value.trim()
  const matrix = useMemo(
    () =>
      normalizedValue
        ? createMatrix(normalizedValue, errorCorrectionLevel)
        : [],
    [errorCorrectionLevel, normalizedValue]
  )

  if (!normalizedValue || matrix.length === 0) {
    return (
      <View className='qr-code-matrix qr-code-matrix--empty'>
        <Text className='qr-code-matrix__empty-text'>暂无二维码</Text>
      </View>
    )
  }

  const moduleSize = Math.max(2, Math.floor(size / matrix.length))
  const actualSize = moduleSize * matrix.length

  return (
    <View
      className='qr-code-matrix'
      style={{
        width: actualSize,
        height: actualSize,
        backgroundColor: lightColor
      }}
    >
      {matrix.map((row, rowIndex) => (
        <View className='qr-code-matrix__row' key={`row-${rowIndex}`}>
          {row.map((active, columnIndex) => (
            <View
              className='qr-code-matrix__cell'
              key={`cell-${rowIndex}-${columnIndex}`}
              style={{
                width: moduleSize,
                height: moduleSize,
                backgroundColor: active ? darkColor : lightColor
              }}
            />
          ))}
        </View>
      ))}
    </View>
  )
}

export default QRCodeMatrix
