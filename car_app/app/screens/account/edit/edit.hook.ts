import { useState } from 'react';
import {
  Asset,
  ImageLibraryOptions,
  launchImageLibrary,
} from 'react-native-image-picker';
import { Alert } from 'react-native';
import { IEditProps } from './IEdit.props';
import { describeImageAsset } from '../../../utils/mobile-image';

export const useEdit = (): IEditProps => {
  const [photo, setPhoto] = useState<Asset>();

  const selectImage = async () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 1,
      assetRepresentationMode: 'compatible',
    };

    try {
      const response = await launchImageLibrary(options);
      if (response.didCancel) {
        return;
      }
      if (response.errorCode || response.errorMessage) {
        Alert.alert(
          'Image selection failed',
          `${response.errorCode || 'unknown'}: ${
            response.errorMessage || 'No additional details were returned.'
          }`,
        );
        return;
      }
      const asset = response.assets?.[0];
      if (!asset) {
        Alert.alert('Image selection failed', describeImageAsset());
        return;
      }
      setPhoto(asset);
    } catch (error) {
      Alert.alert(
        'Image selection failed',
        error instanceof Error ? error.message : 'The image picker failed.',
      );
    }
  };

  return {
    selectImage,
    photo,
  };
};
