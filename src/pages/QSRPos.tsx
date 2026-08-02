import { QSRPosMain } from "@/components/QSR/QSRPosMain";
import { MobileNavigation } from "@/components/ui/mobile-navigation";
import { FeatureLock } from "@/components/Auth/FeatureLock";
import { isNativeApp } from "@/utils/platform";

const QSRPos = () => {
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <FeatureLock feature="qsr-pos.basic" interceptClicks={true}>
        <QSRPosMain />
      </FeatureLock>
      {/* Hide web bottom nav when running inside native Capacitor app */}
      {!isNativeApp() && <MobileNavigation />}
    </div>
  );
};

export default QSRPos;
