import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Keyboard, KeyboardAvoidingView, Platform, View } from 'react-native';
import { BottomSheet } from '../app/components/bottomSheet/BottomSheet';

describe('BottomSheet keyboard handling', () => {
  it('uses platform-aware keyboard avoidance and dismisses a background keyboard', () => {
    const dismissKeyboard = jest.spyOn(Keyboard, 'dismiss');
    let renderer: ReturnType<typeof ReactTestRenderer.create> | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <BottomSheet visible setVisible={jest.fn()}>
          <View />
        </BottomSheet>,
      );
    });

    expect(renderer?.root.findByType(KeyboardAvoidingView).props.behavior).toBe(
      Platform.OS === 'ios' ? 'padding' : 'height',
    );
    expect(dismissKeyboard).toHaveBeenCalledTimes(1);

    ReactTestRenderer.act(() => {
      renderer?.unmount();
    });
    dismissKeyboard.mockRestore();
  });
});
