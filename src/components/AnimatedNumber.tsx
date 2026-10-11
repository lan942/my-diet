// 数字滚动动画：数值变化时从旧值缓动滚动到新值（Count-Up）

import React, { useEffect, useRef, useState } from 'react';
import { Text, type TextProps } from 'react-native';

interface AnimatedNumberProps extends TextProps {
  value: number;
  duration?: number;
  format?: (v: number) => string;
}

export default function AnimatedNumber({
  value,
  duration = 700,
  format,
  ...textProps
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const currentRef = useRef(value);

  useEffect(() => {
    const from = currentRef.current;
    const to = value;
    if (from === to) return;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = from + (to - from) * eased;
      currentRef.current = cur;
      setDisplay(cur);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        currentRef.current = to;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <Text {...textProps}>{format ? format(display) : Math.round(display).toLocaleString()}</Text>
  );
}
