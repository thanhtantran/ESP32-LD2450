
import { InteractiveRoomEsp32 } from '@/components/InteractiveRoom';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LD2450 Detection App',
};


export default function Page() {
  return ( 
    <>
      <InteractiveRoomEsp32 />
    </>
  )
}