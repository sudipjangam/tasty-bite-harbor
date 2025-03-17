
import React from 'react';
import {
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  XAxisProps,
  YAxisProps
} from 'recharts';

// Custom wrapper for XAxis to avoid defaultProps warning
export const XAxis: React.FC<XAxisProps> = (props) => {
  // Default values provided as parameters instead of defaultProps
  const {
    allowDataOverflow = false,
    allowDecimals = true,
    allowDuplicatedCategory = true,
    axisLine = true,
    domain = ['auto', 'auto'],
    height = 30,
    hide = false,
    mirror = false,
    orientation = 'bottom',
    padding = { left: 0, right: 0 },
    reversed = false,
    scale = 'auto',
    tickCount = 5,
    tickLine = true,
    width = 0,
    ...restProps
  } = props;

  return (
    <RechartsXAxis
      allowDataOverflow={allowDataOverflow}
      allowDecimals={allowDecimals}
      allowDuplicatedCategory={allowDuplicatedCategory}
      axisLine={axisLine}
      domain={domain}
      height={height}
      hide={hide}
      mirror={mirror}
      orientation={orientation}
      padding={padding}
      reversed={reversed}
      scale={scale}
      tickCount={tickCount}
      tickLine={tickLine}
      width={width}
      {...restProps}
    />
  );
};

// Custom wrapper for YAxis to avoid defaultProps warning
export const YAxis: React.FC<YAxisProps> = (props) => {
  // Default values provided as parameters instead of defaultProps
  // Remove 'angle' property which is causing the TypeScript error
  const {
    allowDataOverflow = false,
    allowDecimals = true,
    allowDuplicatedCategory = true,
    axisLine = true,
    domain = ['auto', 'auto'],
    height = 0,
    hide = false,
    mirror = false,
    orientation = 'left',
    padding = { top: 0, bottom: 0 },
    reversed = false,
    scale = 'auto',
    tickCount = 5,
    tickLine = true,
    width = 60,
    ...restProps
  } = props;

  return (
    <RechartsYAxis
      allowDataOverflow={allowDataOverflow}
      allowDecimals={allowDecimals}
      allowDuplicatedCategory={allowDuplicatedCategory}
      axisLine={axisLine}
      domain={domain}
      height={height}
      hide={hide}
      mirror={mirror}
      orientation={orientation}
      padding={padding}
      reversed={reversed}
      scale={scale}
      tickCount={tickCount}
      tickLine={tickLine}
      width={width}
      {...restProps}
    />
  );
};
