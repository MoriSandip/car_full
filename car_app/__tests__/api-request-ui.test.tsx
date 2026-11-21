import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Modal } from 'react-native';
import ApiRequestUi from '../app/components/mobile/api-request-ui';
import { beginApiRequest, getRequestUiSnapshot } from '../app/store/request-ui';

describe('API request progress UI', () => {
  it('does not block navigation while a request is pending', () => {
    const finishRequest = beginApiRequest();
    let renderer: ReturnType<typeof ReactTestRenderer.create> | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<ApiRequestUi />);
    });

    expect(renderer?.root.findAllByType(Modal)).toHaveLength(0);
    expect(renderer?.root.findByProps({ pointerEvents: 'none' })).toBeDefined();
    expect(
      renderer?.root.findByProps({ accessibilityRole: 'progressbar' }),
    ).toBeDefined();

    ReactTestRenderer.act(() => {
      renderer?.unmount();
      finishRequest();
    });
  });

  it('shows a dismissible result without blocking navigation', () => {
    const finishRequest = beginApiRequest();
    finishRequest({
      success: true,
      title: 'Action completed',
      message: 'Your changes have been saved successfully.',
    });
    let renderer: ReturnType<typeof ReactTestRenderer.create> | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<ApiRequestUi />);
    });

    expect(renderer?.root.findAllByType(Modal)).toHaveLength(0);
    expect(
      renderer?.root.findByProps({ pointerEvents: 'box-none' }),
    ).toBeDefined();
    const dismissButton = renderer?.root.findByProps({
      accessibilityLabel: 'Dismiss action result',
    });
    expect(dismissButton).toBeDefined();

    ReactTestRenderer.act(() => {
      dismissButton?.props.onPress();
      renderer?.unmount();
    });
    expect(getRequestUiSnapshot().outcome).toBeNull();
  });
});
