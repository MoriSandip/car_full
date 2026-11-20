import React, {useState} from 'react';
import {
  Alert,
  Image,
  PermissionsAndroid,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import Feather from 'react-native-vector-icons/Feather';
import {
  ActionButton,
  Card,
  colors,
  DetailsSheet,
  InfoMessage,
  LoadingMessage,
  ListItemPressable,
  Page,
  PageTitle,
  TextField,
} from '../../components/mobile/ui';
import {
  CarPayload,
  FlatPayload,
  SocietyPayload,
  useCreateCustomerCarMutation,
  useCreateCustomerFlatMutation,
  useCreateCustomerSocietyMutation,
  useDeleteCustomerCarMutation,
  useDeleteCustomerFlatMutation,
  useGetCustomerProfileQuery,
  useGetMyCarsQuery,
  useGetMyFlatsQuery,
  useGetMySocietiesQuery,
  useUploadImageMutation,
  useUpdateCustomerCarMutation,
  useUpdateCustomerFlatMutation,
} from '../../store/customer.api';
import {Car, Flat, RelatedEntity, Society} from '../../store/types';
import {useAppSelector} from '../../store/hooks';
import {StackScreenProps} from '@react-navigation/stack';
import {NavigatorParamList} from '../../navigators/navigation-route';
import {BottomSheet} from '../../components/bottomSheet/BottomSheet';

type Section = 'society' | 'flat' | 'car';
type AssetRouteName = 'CustomerSociety' | 'CustomerFlat' | 'CustomerCar';
type Props = StackScreenProps<NavigatorParamList, AssetRouteName>;

const errorText = (error: unknown) => {
  const value = error as {data?: {message?: string}; message?: string};
  return value.data?.message || value.message || 'Request could not be completed.';
};

const idOf = (entity: RelatedEntity | undefined) =>
  typeof entity === 'string' ? entity : entity?._id ?? '';

const societyDefaults: SocietyPayload = {
  name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  contactPerson: '',
  phone: '',
  email: '',
  description: '',
};

const flatDefaults: FlatPayload = {
  societyId: '',
  flatNumber: '',
  block: '',
  floorNumber: undefined,
  flatType: '2BHK',
  area: undefined,
  status: 'Available',
  description: '',
};

const carDefaults: Omit<CarPayload, 'ownerName' | 'ownerPhone' | 'ownerEmail'> = {
  societyId: '',
  flatId: '',
  registrationNumber: '',
  make: '',
  model: '',
  color: '',
  imageUrl: '',
  carType: 'Sedan',
  parkingSlot: '',
  status: 'Active',
  description: '',
};

const CustomerAssetsScreen = ({route}: Props) => {
  const section: Section =
    route.name === 'CustomerSociety'
      ? 'society'
      : route.name === 'CustomerFlat'
        ? 'flat'
        : 'car';
  const [formVisible, setFormVisible] = useState(false);
  const [selectedSociety, setSelectedSociety] = useState<Society | null>(null);
  const [selectedFlat, setSelectedFlat] = useState<Flat | null>(null);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [societyForm, setSocietyForm] = useState(societyDefaults);
  const [flatForm, setFlatForm] = useState(flatDefaults);
  const [carForm, setCarForm] = useState(carDefaults);
  const [pickedCarImage, setPickedCarImage] = useState<Asset | null>(null);
  const [carImagePreview, setCarImagePreview] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [editingFlat, setEditingFlat] = useState<string | null>(null);
  const [editingCar, setEditingCar] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const currentUser = useAppSelector(state => state.auth.user);
  const societyQuery = useGetMySocietiesQuery();
  const flatQuery = useGetMyFlatsQuery(undefined, {skip: section === 'society'});
  const carQuery = useGetMyCarsQuery(undefined, {skip: section !== 'car'});
  const profileQuery = useGetCustomerProfileQuery(undefined, {
    skip: section !== 'car',
  });
  const societies = societyQuery.data?.data ?? [];
  const flats = flatQuery.data?.data ?? [];
  const cars = carQuery.data?.data ?? [];
  const approvedSocieties = societies.filter(item => item.status === 'VERIFIED');
  const verifiedFlats = flats.filter(
    item => item.verificationStatus === 'VERIFIED',
  );
  const owner = profileQuery.data?.data ?? currentUser;

  const [createSociety, societyMutation] = useCreateCustomerSocietyMutation();
  const [createFlat, flatMutation] = useCreateCustomerFlatMutation();
  const [updateFlat, flatUpdateMutation] = useUpdateCustomerFlatMutation();
  const [deleteFlat, flatDeleteMutation] = useDeleteCustomerFlatMutation();
  const [createCar, carMutation] = useCreateCustomerCarMutation();
  const [updateCar, carUpdateMutation] = useUpdateCustomerCarMutation();
  const [deleteCar, carDeleteMutation] = useDeleteCustomerCarMutation();
  const [uploadImage] = useUploadImageMutation();
  const isLoading =
    societyQuery.isLoading ||
    (section !== 'society' && flatQuery.isLoading) ||
    (section === 'car' && (carQuery.isLoading || profileQuery.isLoading));

  const submitSociety = async () => {
    setError('');
    setNotice('');
    if (!societyForm.name.trim() || !societyForm.address.trim() || !societyForm.city.trim()) {
      setError('Society name, address, and city are required.');
      return;
    }
    try {
      await createSociety({
        ...societyForm,
        name: societyForm.name.trim(),
        address: societyForm.address.trim(),
        city: societyForm.city.trim(),
      }).unwrap();
      setSocietyForm(societyDefaults);
      setNotice('Society submitted. It will be available after admin verification.');
      setFormVisible(false);
    } catch (requestError) {
      setError(errorText(requestError));
    }
  };

  const submitFlat = async () => {
    setError('');
    setNotice('');
    if (!flatForm.societyId || !flatForm.flatNumber.trim() || !flatForm.flatType.trim()) {
      setError('Choose a verified society and enter the flat number and type.');
      return;
    }
    const body = {
      ...flatForm,
      flatNumber: flatForm.flatNumber.trim(),
      flatType: flatForm.flatType.trim(),
      floorNumber: flatForm.floorNumber === undefined ? undefined : Number(flatForm.floorNumber),
      area: flatForm.area === undefined ? undefined : Number(flatForm.area),
    };
    try {
      if (editingFlat) {
        await updateFlat({id: editingFlat, body}).unwrap();
        setNotice('Flat details updated.');
      } else {
        await createFlat(body).unwrap();
        setNotice('Flat submitted. It will be available after admin verification.');
      }
      setFlatForm(flatDefaults);
      setEditingFlat(null);
      setFormVisible(false);
    } catch (requestError) {
      setError(errorText(requestError));
    }
  };

  const submitCar = async () => {
    setError('');
    setNotice('');
    if (
      !carForm.societyId ||
      !carForm.flatId ||
      !carForm.registrationNumber.trim() ||
      !carForm.make.trim() ||
      !carForm.model.trim() ||
      !carForm.color.trim()
    ) {
      setError('Choose a verified society and flat, then complete the car details.');
      return;
    }
    try {
      let imageUrl = carForm.imageUrl || '';
      if (pickedCarImage) {
        const {base64, type} = pickedCarImage;
        if (!base64 || !type?.match(/^image\/(jpeg|png|webp)$/)) {
          throw new Error('Choose a JPEG, PNG, or WebP car image.');
        }
        if (base64.length > 7_000_000) {
          throw new Error('Car image must be 5 MB or smaller.');
        }
        setImageUploading(true);
        const uploadedImage = await uploadImage({
          image: base64,
          mimeType: type,
        }).unwrap();
        imageUrl = uploadedImage.data.url;
      }
      const body = {
        ...carForm,
        imageUrl,
        ownerName: owner?.name || '',
        ownerPhone: owner?.phone || '',
        ownerEmail: owner?.email || '',
        registrationNumber: carForm.registrationNumber.trim().toUpperCase(),
        make: carForm.make.trim(),
        model: carForm.model.trim(),
        color: carForm.color.trim(),
      };
      if (!body.ownerName || !body.ownerPhone) {
        setError('Your profile must include a name and phone number to register a car.');
        return;
      }
      if (editingCar) {
        await updateCar({id: editingCar, body}).unwrap();
        setNotice('Car details updated.');
      } else {
        await createCar(body).unwrap();
        setNotice('Car submitted. It will be available for booking after admin verification.');
      }
      setCarForm(carDefaults);
      setPickedCarImage(null);
      setCarImagePreview('');
      setEditingCar(null);
      setFormVisible(false);
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setImageUploading(false);
    }
  };

  const pickCarImage = async (source: 'camera' | 'library') => {
    setError('');
    try {
      if (source === 'camera' && Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          setError('Camera permission is required to take a car photo.');
          return;
        }
      }
      const options = {
        mediaType: 'photo' as const,
        selectionLimit: 1,
        includeBase64: true,
        quality: 0.7 as const,
        maxWidth: 1280,
        maxHeight: 1280,
        assetRepresentationMode: 'compatible' as const,
      };
      const result =
        source === 'camera'
          ? await launchCamera({...options, cameraType: 'back', saveToPhotos: false})
          : await launchImageLibrary(options);
      if (result.didCancel) return;
      if (result.errorCode || result.errorMessage) {
        setError(result.errorMessage || 'Could not open the photo picker.');
        return;
      }
      const asset = result.assets?.[0];
      if (!asset?.uri || !asset.base64) {
        setError('Could not read the selected image. Please choose another one.');
        return;
      }
      if (!asset.type?.match(/^image\/(jpeg|png|webp)$/)) {
        setError('Choose a JPEG, PNG, or WebP car image.');
        return;
      }
      if (
        (asset.fileSize !== undefined && asset.fileSize > 5 * 1024 * 1024) ||
        asset.base64.length > 7_000_000
      ) {
        setError('Car image must be 5 MB or smaller.');
        return;
      }
      setPickedCarImage(asset);
      setCarImagePreview(asset.uri);
    } catch (pickerError) {
      setError(errorText(pickerError));
    }
  };

  const chooseCarImage = () => {
    Alert.alert('Car photo', 'Take a photo or choose one from your gallery.', [
      {text: 'Take photo', onPress: () => { pickCarImage('camera'); }},
      {text: 'Choose from gallery', onPress: () => { pickCarImage('library'); }},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const removeFlat = async (flat: Flat) => {
    setError('');
    setNotice('');
    try {
      await deleteFlat(flat._id).unwrap();
      setNotice(`Flat ${flat.flatNumber} removed.`);
    } catch (requestError) {
      setError(errorText(requestError));
    }
  };

  const removeCar = async (car: Car) => {
    setError('');
    setNotice('');
    try {
      await deleteCar(car._id).unwrap();
      setNotice(`${car.registrationNumber} removed.`);
    } catch (requestError) {
      setError(errorText(requestError));
    }
  };

  const startFlatEdit = (flat: Flat) => {
    setSelectedFlat(null);
    setFormVisible(true);
    setEditingFlat(flat._id);
    setFlatForm({
      societyId: idOf(flat.societyId),
      flatNumber: flat.flatNumber,
      block: flat.block ?? '',
      floorNumber: flat.floorNumber,
      flatType: flat.flatType ?? '',
      area: flat.area,
      status: flat.status,
      description: flat.description ?? '',
    });
    setNotice('');
    setError('');
  };

  const startCarEdit = (car: Car) => {
    setSelectedCar(null);
    setFormVisible(true);
    setEditingCar(car._id);
    setCarForm({
      societyId: idOf(car.societyId),
      flatId: idOf(car.flatId),
      registrationNumber: car.registrationNumber,
      make: car.make,
      model: car.model,
      color: car.color,
      carType: car.carType,
      parkingSlot: car.parkingSlot ?? '',
      status: car.status as CarPayload['status'],
      description: car.description ?? '',
      imageUrl: car.imageUrl ?? '',
    });
    setPickedCarImage(null);
    setCarImagePreview(car.imageUrl ?? '');
    setNotice('');
    setError('');
  };

  const openCreateForm = () => {
    setError('');
    setNotice('');
    setEditingFlat(null);
    setEditingCar(null);
    setSocietyForm(societyDefaults);
    setFlatForm(flatDefaults);
    setCarForm(carDefaults);
    setPickedCarImage(null);
    setCarImagePreview('');
    setFormVisible(true);
  };

  return (
    <Page
      headerAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${section}`}
          onPress={openCreateForm}
          style={styles.addButton}>
          <Feather name="plus" size={21} color={colors.white} />
        </Pressable>
      }>
      <PageTitle compact
        title={
          section === 'society'
            ? 'My society'
            : section === 'flat'
              ? 'My flats'
              : 'My cars'
        }
        subtitle={
          section === 'society'
            ? 'Register your residential society and track its verification.'
            : section === 'flat'
              ? 'Add and manage the flats linked to your verified society.'
              : 'Register your vehicles and keep their details up to date.'
        }
      />
      {isLoading ? <LoadingMessage text="Loading your registrations..." /> : null}
      {societyQuery.isError ||
      (section !== 'society' && flatQuery.isError) ||
      (section === 'car' && (carQuery.isError || profileQuery.isError)) ? (
        <View style={styles.list}>
          <InfoMessage
            text="Some registration data could not be loaded. Please retry."
            variant="error"
          />
          <ActionButton
            title="Retry loading"
            variant="secondary"
            onPress={() => {
              societyQuery.refetch();
              if (section !== 'society') flatQuery.refetch();
              if (section === 'car') {
                carQuery.refetch();
                profileQuery.refetch();
              }
            }}
          />
        </View>
      ) : null}
      {!formVisible && error ? <InfoMessage text={error} variant="error" /> : null}
      {!formVisible && notice ? <InfoMessage text={notice} variant="success" /> : null}

      {section === 'society' ? (
        <>
          <ListHeading title="Registered societies" count={societies.length} />
          <View style={styles.list}>
            {societies.length ? societies.map(society => <SocietyCard key={society._id} society={society} onPress={() => setSelectedSociety(society)} />) : (
              <EmptyRegistration
                icon="home"
                title="No society registered"
                description="Add your society first. Once verified, you can register flats and cars."
              />
            )}
          </View>
          <FormSheet
            visible={formVisible}
            title="Register a society"
            onClose={() => setFormVisible(false)}>
            {error ? <InfoMessage text={error} variant="error" /> : null}
            <TextField placeholder="Society name *" value={societyForm.name} onChangeText={name => setSocietyForm({...societyForm, name})} />
            <TextField placeholder="Address *" value={societyForm.address} onChangeText={address => setSocietyForm({...societyForm, address})} />
            <TextField placeholder="City *" value={societyForm.city} onChangeText={city => setSocietyForm({...societyForm, city})} />
            <TextField placeholder="State" value={societyForm.state} onChangeText={state => setSocietyForm({...societyForm, state})} />
            <TextField placeholder="Pincode" value={societyForm.pincode} onChangeText={pincode => setSocietyForm({...societyForm, pincode})} keyboardType="number-pad" />
            <TextField placeholder="Contact person" value={societyForm.contactPerson} onChangeText={contactPerson => setSocietyForm({...societyForm, contactPerson})} />
            <TextField placeholder="Contact phone" value={societyForm.phone} onChangeText={phone => setSocietyForm({...societyForm, phone})} keyboardType="phone-pad" />
            <TextField placeholder="Contact email" value={societyForm.email} onChangeText={email => setSocietyForm({...societyForm, email})} keyboardType="email-address" autoCapitalize="none" />
            <ActionButton title={societyMutation.isLoading ? 'Submitting...' : 'Submit society'} onPress={submitSociety} disabled={societyMutation.isLoading} />
          </FormSheet>
        </>
      ) : null}

      {section === 'flat' ? (
        <>
          <ListHeading title="Registered flats" count={flats.length} />
          <View style={styles.list}>
            {flats.length ? flats.map(flat => (
              <FlatCard key={flat._id} flat={flat} onPress={() => setSelectedFlat(flat)} onEdit={() => startFlatEdit(flat)} onDelete={() => removeFlat(flat)} busy={flatDeleteMutation.isLoading} />
            )) : (
              <EmptyRegistration
                icon="grid"
                title="No flats registered"
                description="Register a flat in one of your verified societies to continue."
              />
            )}
          </View>
          <FormSheet
            visible={formVisible}
            title={editingFlat ? 'Edit flat' : 'Register a flat'}
            onClose={() => setFormVisible(false)}>
            {error ? <InfoMessage text={error} variant="error" /> : null}
            {approvedSocieties.length ? (
              <ChoiceList
                title="Choose a verified society"
                items={approvedSocieties.map(item => ({id: item._id, label: item.name}))}
                selected={flatForm.societyId}
                onSelect={societyId => setFlatForm({...flatForm, societyId})}
              />
            ) : (
              <InfoMessage text="A society submitted by you must be verified by admin before you can register its flat." />
            )}
            <TextField placeholder="Flat number *" value={flatForm.flatNumber} onChangeText={flatNumber => setFlatForm({...flatForm, flatNumber})} />
            <TextField placeholder="Block" value={flatForm.block} onChangeText={block => setFlatForm({...flatForm, block})} />
            <TextField placeholder="Floor number" value={flatForm.floorNumber?.toString() ?? ''} onChangeText={value => setFlatForm({...flatForm, floorNumber: value ? Number(value) : undefined})} keyboardType="number-pad" />
            <TextField placeholder="Flat type (e.g. 2BHK) *" value={flatForm.flatType} onChangeText={flatType => setFlatForm({...flatForm, flatType})} />
            <TextField placeholder="Area (sq. ft.)" value={flatForm.area?.toString() ?? ''} onChangeText={value => setFlatForm({...flatForm, area: value ? Number(value) : undefined})} keyboardType="decimal-pad" />
            <ActionButton title={flatMutation.isLoading || flatUpdateMutation.isLoading ? 'Saving...' : editingFlat ? 'Save flat' : 'Submit flat'} onPress={submitFlat} disabled={!approvedSocieties.length || flatMutation.isLoading || flatUpdateMutation.isLoading} />
            {editingFlat ? <ActionButton title="Cancel edit" variant="secondary" onPress={() => {setEditingFlat(null); setFlatForm(flatDefaults); setFormVisible(false);}} /> : null}
          </FormSheet>
        </>
      ) : null}

      {section === 'car' ? (
        <>
          <FormSheet
            visible={formVisible}
            title={editingCar ? 'Edit car' : 'Register a car'}
            onClose={() => setFormVisible(false)}>
            {error ? <InfoMessage text={error} variant="error" /> : null}
            <Card>
            <Text style={styles.cardTitle}>{editingCar ? 'Edit car' : 'Register a car'}</Text>
            {!approvedSocieties.length ? <InfoMessage text="A verified society is required before registering a car." /> : null}
            <ChoiceList
              title="Choose a verified society"
              items={approvedSocieties.map(item => ({id: item._id, label: item.name}))}
              selected={carForm.societyId}
              onSelect={societyId => setCarForm({...carForm, societyId, flatId: ''})}
            />
            <ChoiceList
              title="Choose a verified flat"
              items={verifiedFlats.filter(flat => idOf(flat.societyId) === carForm.societyId).map(flat => ({id: flat._id, label: `${flat.block ? `${flat.block} · ` : ''}${flat.flatNumber}`}))}
              selected={carForm.flatId}
              onSelect={flatId => setCarForm({...carForm, flatId})}
            />
            <Text style={styles.fieldLabel}>
              Owner contact details are taken from your profile.
            </Text>
            <TextField placeholder="Registration number *" value={carForm.registrationNumber} onChangeText={registrationNumber => setCarForm({...carForm, registrationNumber})} autoCapitalize="characters" />
            <TextField placeholder="Make *" value={carForm.make} onChangeText={make => setCarForm({...carForm, make})} />
            <TextField placeholder="Model *" value={carForm.model} onChangeText={model => setCarForm({...carForm, model})} />
            <TextField placeholder="Color *" value={carForm.color} onChangeText={color => setCarForm({...carForm, color})} />
            <Text style={styles.fieldLabel}>Car image (optional, max 5 MB)</Text>
            {carImagePreview ? (
              <Image source={{uri: carImagePreview}} style={styles.carImagePreview} />
            ) : null}
            <ActionButton
              title={pickedCarImage ? 'Choose a different image' : carImagePreview ? 'Change car image' : 'Upload car image'}
              variant="secondary"
              onPress={chooseCarImage}
              disabled={imageUploading || carMutation.isLoading || carUpdateMutation.isLoading}
            />
            <ChoiceList
              title="Car type"
              items={(['Hatchback', 'Sedan', 'SUV', 'MUV', 'Luxury', 'Other'] as const).map(type => ({id: type, label: type}))}
              selected={carForm.carType}
              onSelect={carType => setCarForm({...carForm, carType: carType as Car['carType']})}
            />
            <TextField placeholder="Parking slot (optional)" value={carForm.parkingSlot} onChangeText={parkingSlot => setCarForm({...carForm, parkingSlot})} />
            <ActionButton title={imageUploading ? 'Uploading image...' : carMutation.isLoading || carUpdateMutation.isLoading ? 'Saving...' : editingCar ? 'Save car' : 'Submit car'} onPress={submitCar} disabled={!approvedSocieties.length || imageUploading || carMutation.isLoading || carUpdateMutation.isLoading} />
            {editingCar ? <ActionButton title="Cancel edit" variant="secondary" onPress={() => {setEditingCar(null); setCarForm(carDefaults); setPickedCarImage(null); setCarImagePreview(''); setFormVisible(false);}} /> : null}
            </Card>
          </FormSheet>
          <ListHeading title="Registered cars" count={cars.length} />
          <View style={styles.list}>
            {cars.length ? cars.map(car => (
              <CarCard key={car._id} car={car} onPress={() => setSelectedCar(car)} onEdit={() => startCarEdit(car)} onDelete={() => removeCar(car)} busy={carDeleteMutation.isLoading} />
            )) : (
              <EmptyRegistration
                icon="truck"
                title="No cars registered"
                description="Add your car details to make it available for wash bookings."
              />
            )}
          </View>
        </>
      ) : null}
      <DetailsSheet
        visible={Boolean(selectedSociety)}
        setVisible={visible => !visible && setSelectedSociety(null)}
        title={selectedSociety?.name || 'Society details'}>
        {selectedSociety ? (
          <>
            <AssetDetail title="Status" value={selectedSociety.status} />
            <AssetDetail
              title="Address"
              value={[selectedSociety.address, selectedSociety.city, selectedSociety.state, selectedSociety.pincode].filter(Boolean).join(', ')}
            />
            <AssetDetail title="Contact person" value={selectedSociety.contactPerson} />
            <AssetDetail title="Phone" value={selectedSociety.phone} />
            <AssetDetail title="Email" value={selectedSociety.email} />
            <AssetDetail title="Description" value={selectedSociety.description} />
            <AssetDetail title="Admin note" value={selectedSociety.verificationNote} />
          </>
        ) : null}
      </DetailsSheet>
      <DetailsSheet
        visible={Boolean(selectedFlat)}
        setVisible={visible => !visible && setSelectedFlat(null)}
        title={selectedFlat ? `${selectedFlat.block ? `${selectedFlat.block} · ` : ''}${selectedFlat.flatNumber}` : 'Flat details'}>
        {selectedFlat ? (
          <>
            <AssetDetail title="Society" value={label(selectedFlat.societyId)} />
            <AssetDetail title="Verification" value={selectedFlat.verificationStatus} />
            <AssetDetail title="Type" value={selectedFlat.flatType} />
            <AssetDetail title="Floor" value={selectedFlat.floorNumber?.toString()} />
            <AssetDetail title="Area" value={selectedFlat.area ? `${selectedFlat.area} sq. ft.` : undefined} />
            <AssetDetail title="Occupancy" value={selectedFlat.status} />
            <AssetDetail title="Description" value={selectedFlat.description} />
            <AssetDetail title="Admin note" value={selectedFlat.verificationNote} />
          </>
        ) : null}
      </DetailsSheet>
      <DetailsSheet
        visible={Boolean(selectedCar)}
        setVisible={visible => !visible && setSelectedCar(null)}
        title={selectedCar?.registrationNumber || 'Car details'}>
        {selectedCar ? (
          <>
            {selectedCar.imageUrl ? (
              <Image source={{uri: selectedCar.imageUrl}} style={styles.carImagePreview} />
            ) : null}
            <AssetDetail title="Vehicle" value={`${selectedCar.make} ${selectedCar.model}`} />
            <AssetDetail title="Verification" value={selectedCar.verificationStatus} />
            <AssetDetail title="Type and color" value={`${selectedCar.carType} · ${selectedCar.color}`} />
            <AssetDetail title="Society" value={label(selectedCar.societyId)} />
            <AssetDetail title="Flat" value={label(selectedCar.flatId)} />
            <AssetDetail title="Parking slot" value={selectedCar.parkingSlot} />
            <AssetDetail title="Vehicle status" value={selectedCar.status} />
            <AssetDetail title="Owner" value={selectedCar.ownerName} />
            <AssetDetail title="Phone" value={selectedCar.ownerPhone} />
            <AssetDetail title="Email" value={selectedCar.ownerEmail} />
            <AssetDetail title="Description" value={selectedCar.description} />
            <AssetDetail title="Admin note" value={selectedCar.verificationNote} />
          </>
        ) : null}
      </DetailsSheet>
    </Page>
  );
};

const ChoiceList = ({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: {id: string; label: string}[];
  selected: string;
  onSelect: (id: string) => void;
}) => (
  <View style={styles.choiceGroup}>
    <Text style={styles.fieldLabel}>{title}</Text>
    {items.length ? (
      <View style={styles.choices}>
        {items.map(item => (
          <Pressable key={item.id} onPress={() => onSelect(item.id)} accessibilityRole="button" accessibilityState={{selected: selected === item.id}} style={[styles.choice, selected === item.id && styles.choiceSelected]}>
            <Text style={[styles.choiceText, selected === item.id && styles.choiceTextSelected]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    ) : <Text style={styles.emptyChoice}>No verified options available.</Text>}
  </View>
);

const EmptyRegistration = ({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) => (
  <Card style={styles.emptyRegistration}>
    <View style={styles.emptyRegistrationIcon}>
      <Feather name={icon} size={19} color={colors.primary} />
    </View>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.detail}>{description}</Text>
  </Card>
);

const ListHeading = ({title, count}: {title: string; count: number}) => (
  <View style={styles.listHeading}>
    <Text style={styles.listHeadingTitle}>{title}</Text>
    <Text style={styles.listCount}>{count}</Text>
  </View>
);

const FormSheet = ({
  visible,
  title,
  onClose,
  children,
}: React.PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
}>) => (
  <BottomSheet visible={visible} setVisible={onClose}>
    <View style={styles.formSheet}>
      <View style={styles.formSheetHeader}>
        <Text style={styles.formSheetTitle}>{title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close form"
          onPress={onClose}
          style={styles.closeButton}>
          <Feather name="x" size={19} color={colors.ink} />
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.formSheetContent}>
        {children}
      </ScrollView>
    </View>
  </BottomSheet>
);

const Status = ({value}: {value: string}) => (
  <Text style={[styles.status, value === 'VERIFIED' && styles.statusGood, value === 'REJECTED' && styles.statusBad]}>
    {value}
  </Text>
);

const SocietyCard = ({society, onPress}: {society: Society; onPress: () => void}) => (
  <Card>
    <ListItemPressable accessibilityLabel={`View ${society.name} details`} onPress={onPress} style={styles.assetSummary}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{society.name}</Text>
        <Status value={society.status || 'PENDING'} />
      </View>
      <Text style={styles.detail} numberOfLines={2}>
        {society.address}, {society.city}{society.state ? `, ${society.state}` : ''}
      </Text>
      {society.verificationNote ? <Text style={styles.note} numberOfLines={2}>Admin note: {society.verificationNote}</Text> : null}
      <View style={styles.viewDetails}>
        <Text style={styles.viewDetailsText}>View full details</Text>
        <Feather name="chevron-right" size={16} color={colors.primary} />
      </View>
    </ListItemPressable>
  </Card>
);

const FlatCard = ({flat, onPress, onEdit, onDelete, busy}: {flat: Flat; onPress: () => void; onEdit: () => void; onDelete: () => void; busy: boolean}) => (
  <Card>
    <ListItemPressable accessibilityLabel={`View flat ${flat.flatNumber} details`} onPress={onPress} style={styles.assetSummary}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {flat.block ? `${flat.block} · ` : ''}{flat.flatNumber}
        </Text>
        <Status value={flat.verificationStatus || 'PENDING'} />
      </View>
      <Text style={styles.detail} numberOfLines={1}>
        {label(flat.societyId)} · {flat.flatType || 'Flat'}
      </Text>
      {flat.verificationNote ? <Text style={styles.note} numberOfLines={2}>Admin note: {flat.verificationNote}</Text> : null}
      <View style={styles.viewDetails}>
        <Text style={styles.viewDetailsText}>View full details</Text>
        <Feather name="chevron-right" size={16} color={colors.primary} />
      </View>
    </ListItemPressable>
    <View style={styles.actions}>
      <IconAction icon="edit-2" label="Edit flat" onPress={onEdit} />
      <IconAction icon="trash-2" label="Delete flat" onPress={onDelete} disabled={busy} danger />
    </View>
  </Card>
);

const CarCard = ({car, onPress, onEdit, onDelete, busy}: {car: Car; onPress: () => void; onEdit: () => void; onDelete: () => void; busy: boolean}) => (
  <Card>
    <ListItemPressable accessibilityLabel={`View ${car.registrationNumber} details`} onPress={onPress} style={styles.assetSummary}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{car.registrationNumber}</Text>
        <Status value={car.verificationStatus || 'PENDING'} />
      </View>
      <Text style={styles.detail} numberOfLines={1}>{car.make} {car.model} · {car.carType}</Text>
      <Text style={styles.detail} numberOfLines={1}>{label(car.societyId)} · {label(car.flatId)}</Text>
      {car.verificationNote ? <Text style={styles.note} numberOfLines={2}>Admin note: {car.verificationNote}</Text> : null}
      <View style={styles.viewDetails}>
        <Text style={styles.viewDetailsText}>View full details</Text>
        <Feather name="chevron-right" size={16} color={colors.primary} />
      </View>
    </ListItemPressable>
    <View style={styles.actions}>
      <IconAction icon="edit-2" label="Edit car" onPress={onEdit} />
      <IconAction icon="trash-2" label="Delete car" onPress={onDelete} disabled={busy} danger />
    </View>
  </Card>
);

const AssetDetail = ({title, value}: {title: string; value?: string}) => (
  <View style={styles.assetDetail}>
    <Text style={styles.assetDetailLabel}>{title}</Text>
    <Text style={styles.assetDetailValue}>{value || '—'}</Text>
  </View>
);

const IconAction = ({
  icon,
  label,
  onPress,
  disabled = false,
  danger = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    disabled={disabled}
    onPress={onPress}
    style={[
      styles.iconAction,
      danger && styles.iconActionDanger,
      disabled && styles.iconActionDisabled,
    ]}>
    <Feather
      name={icon}
      size={17}
      color={danger ? colors.danger : colors.primary}
    />
  </Pressable>
);

const label = (value: RelatedEntity) => {
  if (typeof value === 'string') return 'Registered location';
  return [value?.name, value?.block, value?.flatNumber].filter(Boolean).join(' ') || 'Registered location';
};

const styles = StyleSheet.create({
  addButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.primary,
  },
  list: {gap: 9},
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  listHeadingTitle: {fontSize: 14, fontWeight: '800', color: colors.ink},
  listCount: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    backgroundColor: colors.paleBlue,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  formSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.white,
    paddingTop: 8,
  },
  formSheetHeader: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  formSheetTitle: {fontSize: 17, fontWeight: '800', color: colors.ink},
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.canvas,
  },
  formSheetContent: {gap: 12, padding: 16, paddingBottom: 28},
  emptyRegistration: {alignItems: 'flex-start', gap: 8, borderRadius: 15},
  emptyRegistrationIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  cardHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  assetSummary: {gap: 8},
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  viewDetailsText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  assetDetail: {
    gap: 3,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  assetDetailLabel: {fontSize: 11, fontWeight: '600', color: colors.muted},
  assetDetailValue: {fontSize: 14, lineHeight: 20, color: colors.ink},
  cardTitle: {fontSize: 16, fontWeight: '800', color: colors.ink, flexShrink: 1},
  detail: {fontSize: 13, lineHeight: 19, color: colors.muted},
  note: {fontSize: 13, color: colors.danger},
  status: {fontSize: 11, fontWeight: '800', color: '#9A6700', backgroundColor: '#FFF4CE', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, overflow: 'hidden'},
  statusGood: {color: colors.success, backgroundColor: '#E8F5EE'},
  statusBad: {color: colors.danger, backgroundColor: '#FDECEA'},
  fieldLabel: {fontSize: 13, color: colors.ink, fontWeight: '700'},
  choiceGroup: {gap: 8},
  choices: {flexDirection: 'row', flexWrap: 'wrap', gap: 7},
  choice: {borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: colors.white},
  choiceSelected: {borderColor: colors.primary, backgroundColor: colors.paleBlue},
  choiceText: {fontSize: 13, color: colors.ink},
  choiceTextSelected: {fontWeight: '700', color: colors.primaryDark},
  emptyChoice: {fontSize: 13, color: colors.muted},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 6},
  iconAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.paleBlue,
  },
  iconActionDanger: {backgroundColor: '#FDECEA'},
  iconActionDisabled: {opacity: 0.45},
  carImagePreview: {width: '100%', height: 160, borderRadius: 12, backgroundColor: colors.canvas},
});

export default CustomerAssetsScreen;
