import { Point } from '@/types'
import { mapCoordinate } from '@/utils/coordinates'
import { CircleUserRound } from 'lucide-react'


interface DetectedPointsProps {
  points: Point[]
  roomWidth: number
  roomHeight: number
}

// Replace hardcoded colors
const userColors = ['bg-purple-500', 'bg-green-500', 'bg-yellow-500']
const userRingColors = ['ring-purple-300', 'ring-green-300', 'ring-yellow-300']

export function DetectedPoints({ points, roomWidth, roomHeight }: DetectedPointsProps) {
  return (
    <>
      {points.map((point, index) => {
        if (point.x === 0 && point.y === 0) return null
        if (
          !Number.isFinite(point.x) ||
          !Number.isFinite(point.y) ||
          point.x < -5000 ||
          point.x > 5000 ||
          point.y < 0 ||
          point.y > 7000
        ) {
          return null
        }

        const colorIdx = index % userColors.length

        return (
          <div
            key={point.id}
            className={`absolute w-7 h-7 rounded-full ${userColors[colorIdx]} ring-2 ${userRingColors[colorIdx]} shadow-lg flex items-center justify-center transform -translate-x-1/2 translate-y-1/2 z-10 animate-in fade-in zoom-in-50 duration-150`}
            title={`T${point.id}  (x: ${point.x}mm, y: ${point.y}mm)`}
            style={{
              left: mapCoordinate(point.x, -4000, 4000, 0, roomWidth),
              bottom: mapCoordinate(point.y, 1, 6000, 0, roomHeight),
            }}
          >
            <CircleUserRound className="w-[22px] h-[22px] text-white shrink-0" />
          </div>
        )
      })}
    </>
  )
}
