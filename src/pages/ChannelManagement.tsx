
import React from "react";
import ChannelManagementDashboard from "@/components/Revenue/ChannelManagementDashboard";
import { FeatureLock } from "@/components/Auth/FeatureLock";

const ChannelManagement = () => {
  return (
    <FeatureLock feature="rooms.channel_mgmt" interceptClicks={true}>
      <ChannelManagementDashboard />
    </FeatureLock>
  );
};

export default ChannelManagement;
