import Carousel from '../components/Carousel';
import ServicesGrid, { type ServiceItem } from '../components/ServicesGrid';
import {
  IconBank,
  IconCalendar,
  IconCashInOut,
  IconChevronRight,
  IconFuel,
  IconGrid,
  IconHands,
  IconLocation,
  IconMegaphone,
  IconPlusCircle,
  IconStore,
  IconWallet,
} from '../components/icons';

export default function HomeTab({ onService }: { onService: (id: string) => void }) {
  const topGrid: ServiceItem[] = [
    { id: 'send', label: 'Send Money', icon: <IconWallet width={30} height={30} strokeWidth={1.8} /> },
    { id: 'cash', label: 'Cash In/Out', icon: <IconCashInOut width={30} height={30} strokeWidth={1.8} /> },
    { id: 'airtime', label: 'Airtime/Packages', icon: <IconMegaphone width={30} height={30} strokeWidth={1.8} />, badge: '+10%' },
    { id: 'request', label: 'Request Money', icon: <IconHands width={30} height={30} strokeWidth={1.8} /> },
    { id: 'dashen', label: 'Financial Service With Dashen', icon: <img src="/images/dashen.png" alt="Dashen Bank" width={44} height={30} style={{ objectFit: 'contain' }} /> },
    { id: 'cbe', label: 'Financial Service With CBE', icon: <img src="/images/cbe.png" alt="Commercial Bank of Ethiopia" width={44} height={30} style={{ objectFit: 'contain' }} /> },
    { id: 'merchant', label: 'Pay for Merchants', icon: <IconStore width={30} height={30} strokeWidth={1.8} /> },
    { id: 'apps', label: 'App', icon: <IconGrid width={30} height={30} strokeWidth={1.8} /> },
  ];

  const bottomGrid: ServiceItem[] = [
    { id: 'tradefair', label: '33rd Christmas Trade Fair', icon: <img src="/images/christmas.png" alt="Trade fair" width={64} height={34} style={{ objectFit: 'contain' }} /> },
    { id: 'ethio-bill', label: 'Pay Ethio telecom Bill', icon: <img src="/images/ethio-logo.png" alt="Ethio telecom" width={34} height={34} style={{ objectFit: 'contain' }} /> },
    { id: 'schedule', label: 'Schedule Payment', icon: <IconCalendar width={30} height={30} strokeWidth={1.8} /> },
    { id: 'bank', label: 'Transfer to Bank', icon: <IconBank width={30} height={30} strokeWidth={1.8} /> },
    { id: 'wallet', label: 'Transfer to Wallet', icon: <IconWallet width={30} height={30} strokeWidth={1.8} /> },
    { id: 'fuel', label: 'Fuel payment', icon: <IconFuel width={30} height={30} strokeWidth={1.8} /> },
    { id: 'nearby', label: 'Nearby Fuel Station', icon: <IconLocation width={30} height={30} strokeWidth={1.8} /> },
    { id: 'more', label: 'More', icon: <IconPlusCircle width={30} height={30} strokeWidth={1.8} /> },
  ];

  return (
    <>
      <ServicesGrid items={topGrid} onSelect={onService} />
      <div style={{ height: 15 }} />
      <Carousel />
      <button className="txn-link" onClick={() => onService('transactions')}>
        Transaction Details
        <IconChevronRight width={18} height={18} />
      </button>
      <ServicesGrid items={bottomGrid} onSelect={onService} />
    </>
  );
}
