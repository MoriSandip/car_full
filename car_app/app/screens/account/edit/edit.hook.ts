import {useState} from 'react';
import {
  Asset,
  ImageLibraryOptions,
  ImagePickerResponse,
  launchImageLibrary,
} from 'react-native-image-picker';
import {Alert} from 'react-native';
import {IEditProps} from './IEdit.props';

export const useEdit = (): IEditProps => {
  const [photo, setPhoto] = useState<Asset | any>(null);

  const selectImage = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 1,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      } else if (response.errorCode) {
        Alert.alert('Image selection failed', 'Please try again.');
      } else if (response.assets && response.assets.length > 0) {
        setPhoto(response.assets[0]);
      }
    });
  };

  return {
    selectImage,
    photo,
  };
};
