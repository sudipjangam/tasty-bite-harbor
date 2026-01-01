import { QSRPosMain } from "@/components/QSR/QSRPosMain";
import { MobileNavigation } from "@/components/ui/mobile-navigation";

const QSRPos = () => {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <QSRPosMain />
      <MobileNavigation />
    </div>
  );
};

export default QSRPos;
