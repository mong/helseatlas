'use client'

import type { StaticImageData } from 'next/image'

import NextImage from 'next/image'
import React from 'react'

import type { Props as MediaProps } from '../types'

import { getMediaUrl } from '@/utilities/getMediaUrl'

const { breakpoints } = {
  breakpoints: {
    '3xl': 1920,
    '2xl': 1536,
    xl: 1280,
    lg: 1024,
    md: 768,
    sm: 640,
  },
}

// A base64 encoded image to use as a placeholder while the image is loading
const SKDEBlur = 'data:image/png;base64,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'

export const ImageMedia: React.FC<MediaProps> = (props) => {
  const {
    alt: altFromProps,
    resource,
    size: sizeFromProps,
    src: srcFromProps,
    loading: loadingFromProps,
  } = props;

  let width: number | undefined;
  let height: number | undefined;
  let alt = altFromProps;
  let loading = loadingFromProps || 'lazy';
  let src: StaticImageData | string = srcFromProps || '';

  if (!src && resource && typeof resource === 'object') {
    const { alt: altFromResource, height: fullHeight, url, width: fullWidth } = resource;

    width = fullWidth!;
    height = fullHeight!;
    alt = altFromResource || '';

    const cacheTag = resource.updatedAt;

    src = getMediaUrl(url, cacheTag);
  }

  // NOTE: this is used by the browser to determine which image to download at different screen sizes
  const sizes = sizeFromProps
    ? sizeFromProps
    : Object.entries(breakpoints)
      .map(([, value]) => `(max-width: ${value}px) ${value * 2}w`)
      .join(', ');


  return (
    <picture>
      <NextImage
        alt={alt || ''}
        height={height}
        placeholder="blur"
        blurDataURL={SKDEBlur}
        quality={75}
        loading={loading}
        sizes={sizes}
        src={src}
        width={width}
      />
    </picture>
  );
}
