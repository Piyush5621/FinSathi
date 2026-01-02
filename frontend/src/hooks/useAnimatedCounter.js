import { useEffect, useState } from 'react';
import { useSpring, animate } from 'framer-motion';

export const useAnimatedCounter = (value, duration = 1) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      onUpdate: (latest) => {
        setDisplayValue(latest);
      },
      ease: 'easeOut'
    });

    return () => controls.stop();
  }, [value, duration]);

  return Math.round(displayValue);
};

export const useAnimatedValue = (
  endValue,
  options = {
    duration: 1,
    format: 'number', // 'number', 'currency', 'percent'
    prefix: '',
    suffix: ''
  }
) => {
  const [formattedValue, setFormattedValue] = useState('0');

  useEffect(() => {
    const controls = animate(0, endValue, {
      duration: options.duration,
      onUpdate: (latest) => {
        let formatted = latest;
        
        if (options.format === 'currency') {
          formatted = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
          }).format(latest);
        } else if (options.format === 'percent') {
          formatted = `${latest.toFixed(1)}%`;
        } else {
          formatted = Math.round(latest).toLocaleString();
        }

        setFormattedValue(options.prefix + formatted + options.suffix);
      },
      ease: 'easeOut'
    });

    return () => controls.stop();
  }, [endValue, options]);

  return formattedValue;
};
