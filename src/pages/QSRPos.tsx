import { QSRPosMain } from "@/components/QSR/QSRPosMain";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { FeatureLock } from "@/components/Auth/FeatureLock";

const QSRPos = () => {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <FeatureLock feature="qsr-pos.basic" interceptClicks={true}>
        <QSRPosMain />
      </FeatureLock>
      <MobileNavigation />
    </div>
  );
};

export default QSRPos;
