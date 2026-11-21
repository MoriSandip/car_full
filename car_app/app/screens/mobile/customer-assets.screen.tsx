import React, { useMemo, useState } from 'react';
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
import {
  describeImageAsset,
  normalizeImageAsset,
  photoPickerOptions,
} from '../../utils/mobile-image';
import Feather from 'react-native-vector-icons/Feather';
import {
  ActionButton,
  Card,
  colors,
  DetailsSheet,
  FilterBottomSheet,
  InfoMessage,
  LoadingSkeleton,
  ListItemPressable,
  Page,
  SearchFilterBar,
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
import { Car, Flat, RelatedEntity, Society } from '../../store/types';
import { useAppSelector } from '../../store/hooks';
import { StackScreenProps } from '@react-navigation/stack';
import { NavigatorParamList } from '../../navigators/navigation-route';
import { BottomSheet } from '../../components/bottomSheet/BottomSheet';

type Section = 'society' | 'flat' | 'car';
type AssetRouteName = 'CustomerSociety' | 'CustomerFlat' | 'CustomerCar';
type Props = StackScreenProps<NavigatorParamList, AssetRouteName>;
type AssetListItem =
  | { type: 'society'; value: Society }
  | { type: 'flat'; value: Flat }
  | { type: 'car'; value: Car };
const emptySocieties: Society[] = [];
const emptyFlats: Flat[] = [];
const emptyCars: Car[] = [];
const verificationOptions = [
  { label: 'All verification statuses', value: 'All' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Verified', value: 'VERIFIED' },
  { label: 'Rejected', value: 'REJECTED' },
];
const flatStatusOptions = [
  { label: 'All occupancy statuses', value: 'All' },
  { label: 'Available', value: 'Available' },
  { label: 'Occupied', value: 'Occupied' },
  { label: 'Maintenance', value: 'Maintenance' },
];
const carStatusOptions = [
  { label: 'All vehicle statuses', value: 'All' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Maintenance', value: 'Maintenance' },
];

const errorText = (error: unknown) => {
  const value = error as { data?: { message?: string }; message?: string };
  return (
    value.data?.message || value.message || 'Request could not be completed.'
  );
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

const carDefaults: Omit<CarPayload, 'ownerName' | 'ownerPhone' | 'ownerEmail'> =
  {
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

const CustomerAssetsScreen = ({ route }: Props) => {
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
  const [verificationFilter, setVerificationFilter] = useState('All');
  const [assetStatusFilter, setAssetStatusFilter] = useState('All');
  const [draftVerificationFilter, setDraftVerificationFilter] = useState('All');
  const [draftAssetStatusFilter, setDraftAssetStatusFilter] = useState('All');
  const [filterVisible, setFilterVisible] = useState(false);
  const [search, setSearch] = useState('');

  const currentUser = useAppSelector(state => state.auth.user);
  const societyQuery = useGetMySocietiesQuery();
  const flatQuery = useGetMyFlatsQuery(undefined, {
    skip: section === 'society',
  });
  const carQuery = useGetMyCarsQuery(undefined, { skip: section !== 'car' });
  const profileQuery = useGetCustomerProfileQuery(undefined, {
    skip: section !== 'car',
  });
  const societies = societyQuery.data?.data ?? emptySocieties;
  const flats = flatQuery.data?.data ?? emptyFlats;
  const cars = carQuery.data?.data ?? emptyCars;
  const approvedSocieties = societies.filter(
    item => item.status === 'VERIFIED',
  );
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
    console.log('Submitting society:', societyForm);
    setError('');
    setNotice('');
    if (
      !societyForm.name.trim() ||
      !societyForm.address.trim() ||
      !societyForm.city.trim()
    ) {
      setError('Society name, address, and city are required.');
      return;
    }
    try {
      console.log('Creating society ........',)
      await createSociety({
        ...societyForm,
        name: societyForm.name.trim(),
        address: societyForm.address.trim(),
        city: societyForm.city.trim(),
      }).unwrap();
      console.log('Society created successfully////////');
      setSocietyForm(societyDefaults);
      setNotice(
        'Society submitted. It will be available after admin verification.',
      );
      setFormVisible(false);
    } catch (requestError) {
      console.error('Error submitting society:', requestError);
      setError(errorText(requestError));
    }
  };

  const submitFlat = async () => {
    setError('');
    setNotice('');
    if (
      !flatForm.societyId ||
      !flatForm.flatNumber.trim() ||
      !flatForm.flatType.trim()
    ) {
      setError('Choose a verified society and enter the flat number and type.');
      return;
    }
    const body = {
      ...flatForm,
      flatNumber: flatForm.flatNumber.trim(),
      flatType: flatForm.flatType.trim(),
      floorNumber:
        flatForm.floorNumber === undefined
          ? undefined
          : Number(flatForm.floorNumber),
      area: flatForm.area === undefined ? undefined : Number(flatForm.area),
    };
    try {
      if (editingFlat) {
        await updateFlat({ id: editingFlat, body }).unwrap();
        setNotice('Flat details updated.');
      } else {
        await createFlat(body).unwrap();
        setNotice(
          'Flat submitted. It will be available after admin verification.',
        );
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
      setError(
        'Choose a verified society and flat, then complete the car details.',
      );
      return;
    }
    try {
      let imageUrl = carForm.imageUrl || '';
      if (pickedCarImage) {
        const { base64, type } = normalizeImageAsset(pickedCarImage);
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
        setError(
          'Your profile must include a name and phone number to register a car.',
        );
        return;
      }
      if (editingCar) {
        await updateCar({ id: editingCar, body }).unwrap();
        setNotice('Car details updated.');
      } else {
        await createCar(body).unwrap();
        setNotice(
          'Car submitted. It will be available for booking after admin verification.',
        );
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
      const options = photoPickerOptions(0.7, 1280);
      const result =
        source === 'camera'
          ? await launchCamera({
              ...options,
              cameraType: 'back',
              saveToPhotos: false,
            })
          : await launchImageLibrary(options);
      if (result.didCancel) return;
      if (result.errorCode || result.errorMessage) {
        setError(
          `Photo picker error (${result.errorCode || 'unknown'}): ${
            result.errorMessage || 'No additional details were returned.'
          }`,
        );
        return;
      }
      const asset = result.assets?.[0];
      if (!asset) {
        setError(describeImageAsset());
        return;
      }
      setPickedCarImage(asset);
      setCarImagePreview(asset.uri || '');
      const normalizedAsset = normalizeImageAsset(asset);
      if (!asset.uri) {
        setError(
          `Image data is available, but the picker did not return a preview URI. ${describeImageAsset(
            asset,
          )}`,
        );
        return;
      }
      if (
        (normalizedAsset.fileSize !== undefined &&
          normalizedAsset.fileSize > 5 * 1024 * 1024) ||
        normalizedAsset.base64.length > 7_000_000
      ) {
        setError('Car image must be 5 MB or smaller.');
        return;
      }
      setPickedCarImage(normalizedAsset);
      setCarImagePreview(normalizedAsset.uri || '');
    } catch (pickerError) {
      setError(errorText(pickerError));
    }
  };

  const chooseCarImage = () => {
    Alert.alert('Car photo', 'Take a photo or choose one from your gallery.', [
      {
        text: 'Take photo',
        onPress: () => {
          pickCarImage('camera');
        },
      },
      {
        text: 'Choose from gallery',
        onPress: () => {
          pickCarImage('library');
        },
      },
      { text: 'Cancel', style: 'cancel' },
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
  const assetList = useMemo<AssetListItem[]>(() => {
    if (section === 'society') {
      return societies.map(value => ({ type: 'society', value }));
    }
    if (section === 'flat') {
      return flats.map(value => ({ type: 'flat', value }));
    }
    return cars.map(value => ({ type: 'car', value }));
  }, [cars, flats, section, societies]);
  const visibleAssetList = useMemo(() => {
    const term = search.trim().toLowerCase();
    return assetList.filter(item => {
      if (item.type === 'society') {
        const matchesStatus =
          verificationFilter === 'All' ||
          item.value.status === verificationFilter;
        if (!matchesStatus) return false;
        if (!term) return true;
        return [
          item.value.name,
          item.value.address,
          item.value.city,
          item.value.state,
          item.value.pincode,
          item.value.status,
          item.value.contactPerson,
          item.value.phone,
          item.value.email,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term);
      }
      if (
        verificationFilter !== 'All' &&
        item.value.verificationStatus !== verificationFilter
      ) {
        return false;
      }
      if (
        assetStatusFilter !== 'All' &&
        item.value.status !== assetStatusFilter
      ) {
        return false;
      }
      if (!term) return true;
      const searchableText =
        item.type === 'flat'
          ? [
              item.value.flatNumber,
              item.value.block,
              item.value.flatType,
              item.value.floorNumber,
              item.value.area,
              item.value.status,
              item.value.verificationStatus,
              label(item.value.societyId),
            ]
          : [
              item.value.registrationNumber,
              item.value.make,
              item.value.model,
              item.value.color,
              item.value.carType,
              item.value.parkingSlot,
              item.value.status,
              item.value.verificationStatus,
              label(item.value.societyId),
              label(item.value.flatId),
            ];
      return searchableText
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [assetList, assetStatusFilter, search, verificationFilter]);
  const verificationLabel =
    verificationOptions.find(option => option.value === verificationFilter)
      ?.label ?? verificationFilter;
  const assetStatusOptions =
    section === 'flat' ? flatStatusOptions : carStatusOptions;
  const assetStatusLabel =
    assetStatusOptions.find(option => option.value === assetStatusFilter)
      ?.label ?? assetStatusFilter;
  const headingTitle =
    section === 'society'
      ? 'Registered societies'
      : section === 'flat'
      ? 'Registered flats'
      : 'Registered cars';
  const emptyTitle =
    section === 'society'
      ? 'No society registered'
      : section === 'flat'
      ? 'No flats registered'
      : 'No cars registered';
  const emptyDescription =
    section === 'society'
      ? 'Add your society first. Once verified, you can register flats and cars.'
      : section === 'flat'
      ? 'Register a flat in one of your verified societies to continue.'
      : 'Add your car details to make it available for wash bookings.';
  const hasLoadError =
    societyQuery.isError ||
    (section !== 'society' && flatQuery.isError) ||
    (section === 'car' && (carQuery.isError || profileQuery.isError));

  return (
    <Page
      listData={isLoading || hasLoadError ? [] : visibleAssetList}
      listKeyExtractor={item => item.value._id}
      renderListItem={({ item }) => {
        if (item.type === 'society') {
          return (
            <SocietyCard
              society={item.value}
              onPress={() => setSelectedSociety(item.value)}
            />
          );
        }
        if (item.type === 'flat') {
          return (
            <FlatCard
              flat={item.value}
              onPress={() => setSelectedFlat(item.value)}
              onEdit={() => startFlatEdit(item.value)}
              onDelete={() => removeFlat(item.value)}
              busy={flatDeleteMutation.isLoading}
            />
          );
        }
        return (
          <CarCard
            car={item.value}
            onPress={() => setSelectedCar(item.value)}
            onEdit={() => startCarEdit(item.value)}
            onDelete={() => removeCar(item.value)}
            busy={carDeleteMutation.isLoading}
          />
        );
      }}
      headerAction={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${section}`}
          onPress={openCreateForm}
          style={styles.addButton}
        >
          <Feather name="plus" size={21} color={colors.white} />
        </Pressable>
      }
    >
      {isLoading ? <LoadingSkeleton rows={3} /> : null}
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
      {!formVisible && error ? (
        <InfoMessage text={error} variant="error" />
      ) : null}
      {!formVisible && notice ? (
        <InfoMessage text={notice} variant="success" />
      ) : null}
      <ListHeading title={headingTitle} count={visibleAssetList.length} />
      <SearchFilterBar
        value={search}
        onChangeText={setSearch}
        placeholder={
          section === 'society'
            ? 'Search societies'
            : section === 'flat'
            ? 'Search flats'
            : 'Search cars'
        }
        filterAccessibilityLabel={`Filter ${section} records`}
        hasActiveFilters={
          verificationFilter !== 'All' ||
          (section !== 'society' && assetStatusFilter !== 'All')
        }
        onFilterPress={() => {
          setDraftVerificationFilter(verificationFilter);
          setDraftAssetStatusFilter(assetStatusFilter);
          setFilterVisible(true);
        }}
      />
      <View style={styles.activeFilters}>
        <Text style={styles.activeFilterLabel}>Showing</Text>
        <View style={styles.activeFilterChip}>
          <Text style={styles.activeFilterText}>
            {section === 'society'
              ? verificationLabel
              : verificationFilter === 'All' && assetStatusFilter === 'All'
              ? 'All statuses'
              : [
                  verificationFilter !== 'All' ? verificationLabel : null,
                  assetStatusFilter !== 'All' ? assetStatusLabel : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </Text>
        </View>
      </View>
      <FilterBottomSheet
        visible={filterVisible}
        setVisible={setFilterVisible}
        title={`Filter ${section} records`}
        subtitle="Choose which registration statuses to show"
        groups={[
          {
            key: 'verification',
            title:
              section === 'society' ? 'Approval status' : 'Verification status',
            value: draftVerificationFilter,
            defaultValue: 'All',
            options: verificationOptions,
            onChange: setDraftVerificationFilter,
          },
          ...(section === 'society'
            ? []
            : [
                {
                  key: 'assetStatus',
                  title:
                    section === 'flat' ? 'Occupancy status' : 'Vehicle status',
                  value: draftAssetStatusFilter,
                  defaultValue: 'All',
                  options: assetStatusOptions,
                  onChange: setDraftAssetStatusFilter,
                },
              ]),
        ]}
        onApply={() => {
          setVerificationFilter(draftVerificationFilter);
          setAssetStatusFilter(
            section === 'society' ? 'All' : draftAssetStatusFilter,
          );
        }}
      />
      {!isLoading && !hasLoadError && !visibleAssetList.length ? (
        <EmptyRegistration
          icon={
            section === 'society'
              ? 'home'
              : section === 'flat'
              ? 'grid'
              : 'truck'
          }
          title={assetList.length ? 'No matching records' : emptyTitle}
          description={
            assetList.length
              ? 'Try another search or filter to see more records.'
              : emptyDescription
          }
        />
      ) : null}

      {section === 'society' ? (
        <>
          <FormSheet
            visible={formVisible}
            title="Register a society"
            subtitle="Add community and contact information for verification."
            icon="home"
            onClose={() => setFormVisible(false)}
          >
            {error ? <InfoMessage text={error} variant="error" /> : null}
            <Card style={styles.formSection}>
              <FormSectionHeader
                icon="home"
                title="Community details"
                subtitle="Basic location information"
              />
              <TextField
                placeholder="Society name *"
                value={societyForm.name}
                onChangeText={name => setSocietyForm({ ...societyForm, name })}
              />
              <TextField
                placeholder="Address *"
                value={societyForm.address}
                onChangeText={address =>
                  setSocietyForm({ ...societyForm, address })
                }
              />
              <TextField
                placeholder="City *"
                value={societyForm.city}
                onChangeText={city => setSocietyForm({ ...societyForm, city })}
              />
              <TextField
                placeholder="State"
                value={societyForm.state}
                onChangeText={state =>
                  setSocietyForm({ ...societyForm, state })
                }
              />
              <TextField
                placeholder="Pincode"
                value={societyForm.pincode}
                onChangeText={pincode =>
                  setSocietyForm({ ...societyForm, pincode })
                }
                keyboardType="number-pad"
              />
            </Card>
            <Card style={styles.formSection}>
              <FormSectionHeader
                icon="phone"
                title="Contact details"
                subtitle="Optional point of contact for verification"
              />
              <TextField
                placeholder="Contact person"
                value={societyForm.contactPerson}
                onChangeText={contactPerson =>
                  setSocietyForm({ ...societyForm, contactPerson })
                }
              />
              <TextField
                placeholder="Contact phone"
                value={societyForm.phone}
                onChangeText={phone =>
                  setSocietyForm({ ...societyForm, phone })
                }
                keyboardType="phone-pad"
              />
              <TextField
                placeholder="Contact email"
                value={societyForm.email}
                onChangeText={email =>
                  setSocietyForm({ ...societyForm, email })
                }
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Card>
            <ActionButton
              title={
                societyMutation.isLoading ? 'Submitting...' : 'Submit society'
              }
              onPress={submitSociety}
              disabled={societyMutation.isLoading}
            />
          </FormSheet>
        </>
      ) : null}

      {section === 'flat' ? (
        <>
          <FormSheet
            visible={formVisible}
            title={editingFlat ? 'Edit flat' : 'Register a flat'}
            subtitle="Connect the flat to a verified society and add its details."
            icon="grid"
            onClose={() => setFormVisible(false)}
          >
            {error ? <InfoMessage text={error} variant="error" /> : null}
            <Card style={styles.formSection}>
              <FormSectionHeader
                icon="home"
                title="Society"
                subtitle="Choose the community where the flat is located"
              />
              {approvedSocieties.length ? (
                <ChoiceList
                  title="Choose a verified society"
                  items={approvedSocieties.map(item => ({
                    id: item._id,
                    label: item.name,
                  }))}
                  selected={flatForm.societyId}
                  onSelect={societyId =>
                    setFlatForm({ ...flatForm, societyId })
                  }
                />
              ) : (
                <InfoMessage text="A society submitted by you must be verified by admin before you can register its flat." />
              )}
            </Card>
            <Card style={styles.formSection}>
              <FormSectionHeader
                icon="grid"
                title="Flat details"
                subtitle="Enter the flat number and property information"
              />
              <TextField
                placeholder="Flat number *"
                value={flatForm.flatNumber}
                onChangeText={flatNumber =>
                  setFlatForm({ ...flatForm, flatNumber })
                }
              />
              <TextField
                placeholder="Block"
                value={flatForm.block}
                onChangeText={block => setFlatForm({ ...flatForm, block })}
              />
              <TextField
                placeholder="Floor number"
                value={flatForm.floorNumber?.toString() ?? ''}
                onChangeText={value =>
                  setFlatForm({
                    ...flatForm,
                    floorNumber: value ? Number(value) : undefined,
                  })
                }
                keyboardType="number-pad"
              />
              <TextField
                placeholder="Flat type (e.g. 2BHK) *"
                value={flatForm.flatType}
                onChangeText={flatType =>
                  setFlatForm({ ...flatForm, flatType })
                }
              />
              <TextField
                placeholder="Area (sq. ft.)"
                value={flatForm.area?.toString() ?? ''}
                onChangeText={value =>
                  setFlatForm({
                    ...flatForm,
                    area: value ? Number(value) : undefined,
                  })
                }
                keyboardType="decimal-pad"
              />
            </Card>
            <ActionButton
              title={
                flatMutation.isLoading || flatUpdateMutation.isLoading
                  ? 'Saving...'
                  : editingFlat
                  ? 'Save flat'
                  : 'Submit flat'
              }
              onPress={submitFlat}
              disabled={
                !approvedSocieties.length ||
                flatMutation.isLoading ||
                flatUpdateMutation.isLoading
              }
            />
            {editingFlat ? (
              <ActionButton
                title="Cancel edit"
                variant="secondary"
                onPress={() => {
                  setEditingFlat(null);
                  setFlatForm(flatDefaults);
                  setFormVisible(false);
                }}
              />
            ) : null}
          </FormSheet>
        </>
      ) : null}

      {section === 'car' ? (
        <>
          <FormSheet
            visible={formVisible}
            title={editingCar ? 'Edit car' : 'Register a car'}
            subtitle="Add vehicle details and link it to your registered flat."
            icon="truck"
            onClose={() => setFormVisible(false)}
          >
            {error ? <InfoMessage text={error} variant="error" /> : null}
            <Card style={styles.formSection}>
              <FormSectionHeader
                icon="map-pin"
                title="Parking location"
                subtitle="Select a verified society and flat"
              />
              {!approvedSocieties.length ? (
                <InfoMessage text="A verified society is required before registering a car." />
              ) : null}
              <ChoiceList
                title="Choose a verified society"
                items={approvedSocieties.map(item => ({
                  id: item._id,
                  label: item.name,
                }))}
                selected={carForm.societyId}
                onSelect={societyId =>
                  setCarForm({ ...carForm, societyId, flatId: '' })
                }
              />
              <ChoiceList
                title="Choose a verified flat"
                items={verifiedFlats
                  .filter(flat => idOf(flat.societyId) === carForm.societyId)
                  .map(flat => ({
                    id: flat._id,
                    label: `${flat.block ? `${flat.block} · ` : ''}${
                      flat.flatNumber
                    }`,
                  }))}
                selected={carForm.flatId}
                onSelect={flatId => setCarForm({ ...carForm, flatId })}
              />
            </Card>
            <Card style={styles.formSection}>
              <FormSectionHeader
                icon="truck"
                title="Vehicle details"
                subtitle="Owner contact details are taken from your profile"
              />
              <TextField
                placeholder="Registration number *"
                value={carForm.registrationNumber}
                onChangeText={registrationNumber =>
                  setCarForm({ ...carForm, registrationNumber })
                }
                autoCapitalize="characters"
              />
              <TextField
                placeholder="Make *"
                value={carForm.make}
                onChangeText={make => setCarForm({ ...carForm, make })}
              />
              <TextField
                placeholder="Model *"
                value={carForm.model}
                onChangeText={model => setCarForm({ ...carForm, model })}
              />
              <TextField
                placeholder="Color *"
                value={carForm.color}
                onChangeText={color => setCarForm({ ...carForm, color })}
              />
              <ChoiceList
                title="Car type"
                items={(
                  [
                    'Hatchback',
                    'Sedan',
                    'SUV',
                    'MUV',
                    'Luxury',
                    'Other',
                  ] as const
                ).map(type => ({ id: type, label: type }))}
                selected={carForm.carType}
                onSelect={carType =>
                  setCarForm({ ...carForm, carType: carType as Car['carType'] })
                }
              />
              <TextField
                placeholder="Parking slot (optional)"
                value={carForm.parkingSlot}
                onChangeText={parkingSlot =>
                  setCarForm({ ...carForm, parkingSlot })
                }
              />
            </Card>
            <Card style={styles.formSection}>
              <FormSectionHeader
                icon="image"
                title="Car photo"
                subtitle="Optional · JPEG or PNG up to 5 MB"
              />
              {carImagePreview ? (
                <Image
                  source={{ uri: carImagePreview }}
                  style={styles.carImagePreview}
                  onError={event =>
                    setError(
                      `Car photo was selected, but its preview could not load: ${
                        event.nativeEvent.error ||
                        'Image source is unavailable.'
                      }`,
                    )
                  }
                />
              ) : null}
              <ActionButton
                title={
                  pickedCarImage
                    ? 'Choose a different image'
                    : carImagePreview
                    ? 'Change car image'
                    : 'Upload car image'
                }
                variant="secondary"
                onPress={chooseCarImage}
                disabled={
                  imageUploading ||
                  carMutation.isLoading ||
                  carUpdateMutation.isLoading
                }
              />
            </Card>
            <Card style={styles.formSection}>
              <FormSectionHeader
                icon="check-circle"
                title="Save registration"
                subtitle="Your car will be reviewed before it is available for booking"
              />
              <ActionButton
                title={
                  imageUploading
                    ? 'Uploading image...'
                    : carMutation.isLoading || carUpdateMutation.isLoading
                    ? 'Saving...'
                    : editingCar
                    ? 'Save car'
                    : 'Submit car'
                }
                onPress={submitCar}
                disabled={
                  !approvedSocieties.length ||
                  imageUploading ||
                  carMutation.isLoading ||
                  carUpdateMutation.isLoading
                }
              />
              {editingCar ? (
                <ActionButton
                  title="Cancel edit"
                  variant="secondary"
                  onPress={() => {
                    setEditingCar(null);
                    setCarForm(carDefaults);
                    setPickedCarImage(null);
                    setCarImagePreview('');
                    setFormVisible(false);
                  }}
                />
              ) : null}
            </Card>
          </FormSheet>
        </>
      ) : null}
      <DetailsSheet
        visible={Boolean(selectedSociety)}
        setVisible={visible => !visible && setSelectedSociety(null)}
        title={selectedSociety?.name || 'Society details'}
      >
        {selectedSociety ? (
          <>
            <Card style={styles.detailHero}>
              <View style={styles.assetDetailHeroHeader}>
                <View style={styles.detailHeroIcon}>
                  <Feather name="home" size={20} color={colors.primary} />
                </View>
                <View style={styles.assetTitleGroup}>
                  <Text style={styles.cardTitle}>{selectedSociety.name}</Text>
                  <Text style={styles.detail} numberOfLines={2}>
                    {selectedSociety.city}
                    {selectedSociety.state ? `, ${selectedSociety.state}` : ''}
                  </Text>
                </View>
                <Status value={selectedSociety.status} />
              </View>
              <View style={styles.detailHeroMeta}>
                <Feather name="map-pin" size={14} color={colors.primary} />
                <Text style={styles.detailHeroMetaText}>
                  {selectedSociety.address}
                  {selectedSociety.pincode
                    ? ` · ${selectedSociety.pincode}`
                    : ''}
                </Text>
              </View>
            </Card>
            <AssetSection icon="map" title="Community location">
              <AssetDetail
                title="Address"
                value={[
                  selectedSociety.address,
                  selectedSociety.city,
                  selectedSociety.state,
                  selectedSociety.pincode,
                ]
                  .filter(Boolean)
                  .join(', ')}
              />
              <AssetDetail
                title="Description"
                value={selectedSociety.description}
              />
            </AssetSection>
            <AssetSection icon="phone" title="Contact & verification">
              <AssetDetail
                title="Contact person"
                value={selectedSociety.contactPerson}
              />
              <AssetDetail title="Phone" value={selectedSociety.phone} />
              <AssetDetail title="Email" value={selectedSociety.email} />
              <AssetDetail
                title="Admin note"
                value={selectedSociety.verificationNote}
              />
            </AssetSection>
          </>
        ) : null}
      </DetailsSheet>
      <DetailsSheet
        visible={Boolean(selectedFlat)}
        setVisible={visible => !visible && setSelectedFlat(null)}
        title={
          selectedFlat
            ? `${selectedFlat.block ? `${selectedFlat.block} · ` : ''}${
                selectedFlat.flatNumber
              }`
            : 'Flat details'
        }
      >
        {selectedFlat ? (
          <>
            <Card style={styles.detailHero}>
              <View style={styles.assetDetailHeroHeader}>
                <View style={styles.detailHeroIcon}>
                  <Feather name="grid" size={20} color={colors.primary} />
                </View>
                <View style={styles.assetTitleGroup}>
                  <Text style={styles.cardTitle}>
                    {selectedFlat.block ? `${selectedFlat.block} · ` : ''}
                    {selectedFlat.flatNumber}
                  </Text>
                  <Text style={styles.detail} numberOfLines={1}>
                    {label(selectedFlat.societyId)} ·{' '}
                    {selectedFlat.flatType || 'Flat'}
                  </Text>
                </View>
                <Status value={selectedFlat.verificationStatus} />
              </View>
              <View style={styles.assetTagRow}>
                <Status value={selectedFlat.status} />
                {selectedFlat.floorNumber !== undefined ? (
                  <View style={styles.assetTag}>
                    <Text style={styles.assetTagText}>
                      Floor {selectedFlat.floorNumber}
                    </Text>
                  </View>
                ) : null}
                {selectedFlat.area ? (
                  <View style={styles.assetTag}>
                    <Text style={styles.assetTagText}>
                      {selectedFlat.area} sq. ft.
                    </Text>
                  </View>
                ) : null}
              </View>
            </Card>
            <AssetSection icon="grid" title="Flat information">
              <AssetDetail
                title="Society"
                value={label(selectedFlat.societyId)}
              />
              <AssetDetail title="Type" value={selectedFlat.flatType} />
              <AssetDetail
                title="Floor"
                value={selectedFlat.floorNumber?.toString()}
              />
              <AssetDetail
                title="Area"
                value={
                  selectedFlat.area ? `${selectedFlat.area} sq. ft.` : undefined
                }
              />
              <AssetDetail
                title="Description"
                value={selectedFlat.description}
              />
            </AssetSection>
            <AssetSection icon="check-circle" title="Verification">
              <AssetDetail
                title="Verification status"
                value={selectedFlat.verificationStatus}
              />
              <AssetDetail
                title="Occupancy status"
                value={selectedFlat.status}
              />
              <AssetDetail
                title="Admin note"
                value={selectedFlat.verificationNote}
              />
            </AssetSection>
          </>
        ) : null}
      </DetailsSheet>
      <DetailsSheet
        visible={Boolean(selectedCar)}
        setVisible={visible => !visible && setSelectedCar(null)}
        title={selectedCar?.registrationNumber || 'Car details'}
      >
        {selectedCar ? (
          <>
            <Card style={styles.detailHero}>
              {selectedCar.imageUrl ? (
                <Image
                  source={{ uri: selectedCar.imageUrl }}
                  style={styles.carDetailImage}
                />
              ) : (
                <View style={styles.carDetailPlaceholder}>
                  <Feather name="truck" size={30} color={colors.primary} />
                </View>
              )}
              <View style={styles.assetDetailHeroHeader}>
                <View style={styles.assetTitleGroup}>
                  <Text style={styles.cardTitle}>
                    {selectedCar.registrationNumber}
                  </Text>
                  <Text style={styles.detail}>
                    {selectedCar.make} {selectedCar.model}
                  </Text>
                </View>
                <Status value={selectedCar.verificationStatus} />
              </View>
              <View style={styles.assetTagRow}>
                <Status value={selectedCar.status} />
                <View style={styles.assetTag}>
                  <Text style={styles.assetTagText}>{selectedCar.carType}</Text>
                </View>
                <View style={styles.assetTag}>
                  <Text style={styles.assetTagText}>{selectedCar.color}</Text>
                </View>
              </View>
            </Card>
            <AssetSection icon="truck" title="Vehicle information">
              <AssetDetail
                title="Make and model"
                value={`${selectedCar.make} ${selectedCar.model}`}
              />
              <AssetDetail title="Type" value={selectedCar.carType} />
              <AssetDetail title="Color" value={selectedCar.color} />
              <AssetDetail
                title="Parking slot"
                value={selectedCar.parkingSlot}
              />
              <AssetDetail title="Vehicle status" value={selectedCar.status} />
            </AssetSection>
            <AssetSection icon="map-pin" title="Parking location">
              <AssetDetail
                title="Society"
                value={label(selectedCar.societyId)}
              />
              <AssetDetail title="Flat" value={label(selectedCar.flatId)} />
            </AssetSection>
            <AssetSection icon="user" title="Owner & verification">
              <AssetDetail title="Owner" value={selectedCar.ownerName} />
              <AssetDetail title="Phone" value={selectedCar.ownerPhone} />
              <AssetDetail title="Email" value={selectedCar.ownerEmail} />
              <AssetDetail
                title="Description"
                value={selectedCar.description}
              />
              <AssetDetail
                title="Verification status"
                value={selectedCar.verificationStatus}
              />
              <AssetDetail
                title="Admin note"
                value={selectedCar.verificationNote}
              />
            </AssetSection>
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
  items: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) => (
  <View style={styles.choiceGroup}>
    <Text style={styles.fieldLabel}>{title}</Text>
    {items.length ? (
      <View style={styles.choices}>
        {items.map(item => (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === item.id }}
            style={[
              styles.choice,
              selected === item.id && styles.choiceSelected,
            ]}
          >
            <Text
              style={[
                styles.choiceText,
                selected === item.id && styles.choiceTextSelected,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    ) : (
      <Text style={styles.emptyChoice}>No verified options available.</Text>
    )}
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

const ListHeading = ({ title, count }: { title: string; count: number }) => (
  <View style={styles.listHeading}>
    <Text style={styles.listHeadingTitle}>{title}</Text>
    <Text style={styles.listCount}>{count}</Text>
  </View>
);

const FormSheet = ({
  visible,
  title,
  subtitle,
  icon,
  onClose,
  children,
}: React.PropsWithChildren<{
  visible: boolean;
  title: string;
  subtitle: string;
  icon: string;
  onClose: () => void;
}>) => (
  <BottomSheet visible={visible} setVisible={onClose}>
    <View style={styles.formSheet}>
      <View style={styles.formSheetHeader}>
        <View style={styles.formHeaderIcon}>
          <Feather name={icon} size={19} color={colors.primary} />
        </View>
        <View style={styles.formHeaderCopy}>
          <Text style={styles.formSheetTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.formSheetSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close form"
          onPress={onClose}
          style={styles.closeButton}
        >
          <Feather name="x" size={19} color={colors.ink} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.formSheetScroll}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.formSheetContent}
      >
        {children}
      </ScrollView>
    </View>
  </BottomSheet>
);

const FormSectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) => (
  <View style={styles.formSectionHeader}>
    <View style={styles.formSectionIcon}>
      <Feather name={icon} size={15} color={colors.primary} />
    </View>
    <View style={styles.formSectionCopy}>
      <Text style={styles.formSectionTitle}>{title}</Text>
      <Text style={styles.formSectionSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

const Status = ({ value }: { value: string }) => {
  const isGood = ['VERIFIED', 'Active', 'Available'].includes(value);
  const isBad = ['REJECTED', 'Inactive'].includes(value);
  const isMaintenance = value === 'Maintenance';
  const label =
    value === 'VERIFIED'
      ? 'Verified'
      : value === 'PENDING'
      ? 'Pending'
      : value === 'REJECTED'
      ? 'Rejected'
      : value;

  return (
    <View
      style={[
        styles.status,
        isGood && styles.statusGood,
        isBad && styles.statusBad,
        isMaintenance && styles.statusWarning,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          isGood && styles.statusGoodText,
          isBad && styles.statusBadText,
          isMaintenance && styles.statusWarningText,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const SocietyCard = ({
  society,
  onPress,
}: {
  society: Society;
  onPress: () => void;
}) => (
  <Card style={styles.assetCard}>
    <ListItemPressable
      accessibilityLabel={`View ${society.name} details`}
      onPress={onPress}
      style={styles.assetSummary}
    >
      <View style={styles.assetCardHeader}>
        <View style={styles.assetIcon}>
          <Feather name="home" size={18} color={colors.primary} />
        </View>
        <View style={styles.assetTitleGroup}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {society.name}
          </Text>
          <Text style={styles.assetSubtitle}>Residential community</Text>
        </View>
        <Status value={society.status || 'PENDING'} />
      </View>
      <View style={styles.assetMetaRow}>
        <Feather name="map-pin" size={14} color={colors.primary} />
        <Text style={styles.detail} numberOfLines={2}>
          {society.address}, {society.city}
          {society.state ? `, ${society.state}` : ''}
        </Text>
      </View>
      {society.verificationNote ? (
        <Text style={styles.note} numberOfLines={2}>
          Admin note: {society.verificationNote}
        </Text>
      ) : null}
      <AssetCardFooter />
    </ListItemPressable>
  </Card>
);

const FlatCard = ({
  flat,
  onPress,
  onEdit,
  onDelete,
  busy,
}: {
  flat: Flat;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) => (
  <Card style={styles.assetCard}>
    <ListItemPressable
      accessibilityLabel={`View flat ${flat.flatNumber} details`}
      onPress={onPress}
      style={styles.assetSummary}
    >
      <View style={styles.assetCardHeader}>
        <View style={styles.assetIcon}>
          <Feather name="grid" size={18} color={colors.primary} />
        </View>
        <View style={styles.assetTitleGroup}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {flat.block ? `${flat.block} · ` : ''}
            {flat.flatNumber}
          </Text>
          <Text style={styles.assetSubtitle} numberOfLines={1}>
            {label(flat.societyId)}
          </Text>
        </View>
        <Status value={flat.verificationStatus || 'PENDING'} />
      </View>
      <View style={styles.assetTagRow}>
        <View style={styles.assetTag}>
          <Feather name="layers" size={12} color={colors.primary} />
          <Text style={styles.assetTagText}>{flat.flatType || 'Flat'}</Text>
        </View>
        <Status value={flat.status} />
        {flat.floorNumber !== undefined ? (
          <View style={styles.assetTag}>
            <Text style={styles.assetTagText}>Floor {flat.floorNumber}</Text>
          </View>
        ) : null}
        {flat.area ? (
          <View style={styles.assetTag}>
            <Text style={styles.assetTagText}>{flat.area} sq. ft.</Text>
          </View>
        ) : null}
      </View>
      {flat.verificationNote ? (
        <Text style={styles.note} numberOfLines={2}>
          Admin note: {flat.verificationNote}
        </Text>
      ) : null}
      <AssetCardFooter />
    </ListItemPressable>
    <View style={styles.assetActions}>
      <IconAction icon="edit-2" label="Edit flat" onPress={onEdit} />
      <IconAction
        icon="trash-2"
        label="Delete flat"
        onPress={onDelete}
        disabled={busy}
        danger
      />
    </View>
  </Card>
);

const CarCard = ({
  car,
  onPress,
  onEdit,
  onDelete,
  busy,
}: {
  car: Car;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
}) => (
  <Card style={styles.assetCard}>
    <ListItemPressable
      accessibilityLabel={`View ${car.registrationNumber} details`}
      onPress={onPress}
      style={styles.assetSummary}
    >
      <View style={styles.assetCardHeader}>
        {car.imageUrl ? (
          <Image source={{ uri: car.imageUrl }} style={styles.carThumbnail} />
        ) : (
          <View style={styles.assetIcon}>
            <Feather name="truck" size={18} color={colors.primary} />
          </View>
        )}
        <View style={styles.assetTitleGroup}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {car.registrationNumber}
          </Text>
          <Text style={styles.assetSubtitle} numberOfLines={1}>
            {car.make} {car.model}
          </Text>
        </View>
        <Status value={car.verificationStatus || 'PENDING'} />
      </View>
      <View style={styles.assetMetaRow}>
        <Feather name="map-pin" size={14} color={colors.primary} />
        <Text style={styles.detail} numberOfLines={1}>
          {label(car.societyId)} · {label(car.flatId)}
        </Text>
      </View>
      <View style={styles.assetTagRow}>
        <View style={styles.assetTag}>
          <Feather name="truck" size={12} color={colors.primary} />
          <Text style={styles.assetTagText}>{car.carType}</Text>
        </View>
        <View style={styles.assetTag}>
          <Text style={styles.assetTagText}>{car.color}</Text>
        </View>
        <Status value={car.status} />
      </View>
      {car.verificationNote ? (
        <Text style={styles.note} numberOfLines={2}>
          Admin note: {car.verificationNote}
        </Text>
      ) : null}
      <AssetCardFooter />
    </ListItemPressable>
    <View style={styles.assetActions}>
      <IconAction icon="edit-2" label="Edit car" onPress={onEdit} />
      <IconAction
        icon="trash-2"
        label="Delete car"
        onPress={onDelete}
        disabled={busy}
        danger
      />
    </View>
  </Card>
);

const AssetCardFooter = () => (
  <View style={styles.viewDetails}>
    <Text style={styles.viewDetailsText}>View full details</Text>
    <Feather name="chevron-right" size={16} color={colors.primary} />
  </View>
);

const AssetDetail = ({ title, value }: { title: string; value?: string }) => (
  <View style={styles.assetDetail}>
    <Text style={styles.assetDetailLabel}>{title}</Text>
    <Text style={styles.assetDetailValue}>{value || '—'}</Text>
  </View>
);

const AssetSection = ({
  icon,
  title,
  children,
}: React.PropsWithChildren<{ icon: string; title: string }>) => (
  <Card style={styles.detailSection}>
    <View style={styles.detailSectionHeading}>
      <View style={styles.detailSectionIcon}>
        <Feather name={icon} size={15} color={colors.primary} />
      </View>
      <Text style={styles.detailSectionTitle}>{title}</Text>
    </View>
    {children}
  </Card>
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
    ]}
  >
    <Feather
      name={icon}
      size={17}
      color={danger ? colors.danger : colors.primary}
    />
  </Pressable>
);

const label = (value: RelatedEntity) => {
  if (typeof value === 'string') return 'Registered location';
  return (
    [value?.name, value?.block, value?.flatNumber].filter(Boolean).join(' ') ||
    'Registered location'
  );
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
  list: { gap: 9 },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  listHeadingTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
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
  activeFilters: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  activeFilterLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  activeFilterChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  activeFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  formSheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.white,
    paddingTop: 8,
  },
  formSheetHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  formHeaderIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: colors.paleBlue,
  },
  formHeaderCopy: { flex: 1, gap: 3 },
  formSheetTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  formSheetSubtitle: { fontSize: 11, lineHeight: 15, color: colors.muted },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: colors.canvas,
  },
  formSheetContent: { gap: 12, padding: 16, paddingBottom: 28 },
  formSheetScroll: { flexShrink: 1 },
  formSection: { gap: 12, borderRadius: 17 },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 2,
  },
  formSectionIcon: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  formSectionCopy: { flex: 1, gap: 2 },
  formSectionTitle: { fontSize: 13, fontWeight: '800', color: colors.ink },
  formSectionSubtitle: { fontSize: 11, lineHeight: 15, color: colors.muted },
  emptyRegistration: { alignItems: 'flex-start', gap: 8, borderRadius: 15 },
  emptyRegistrationIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  assetCard: { gap: 10, borderRadius: 17, paddingVertical: 14 },
  assetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  assetIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  assetTitleGroup: { flex: 1, gap: 3 },
  assetSubtitle: { fontSize: 11, color: colors.muted },
  carThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.canvas,
  },
  assetMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  assetTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  assetTag: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: colors.canvas,
  },
  assetTagText: { fontSize: 11, fontWeight: '700', color: colors.muted },
  assetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 7,
    paddingTop: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  assetSummary: { gap: 8 },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  viewDetailsText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  assetDetailHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailHero: { gap: 13, borderRadius: 18, padding: 15 },
  detailHeroIcon: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  detailHeroMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 11,
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
  detailHeroMetaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink,
  },
  detailSection: { gap: 6, borderRadius: 17 },
  detailSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 3,
  },
  detailSectionIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
  },
  detailSectionTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  assetDetail: {
    gap: 3,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  assetDetailLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  assetDetailValue: { fontSize: 14, lineHeight: 20, color: colors.ink },
  carDetailImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: colors.canvas,
  },
  carDetailPlaceholder: {
    width: '100%',
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
    flexShrink: 1,
  },
  detail: { fontSize: 13, lineHeight: 19, color: colors.muted },
  note: { fontSize: 13, color: colors.danger },
  status: {
    backgroundColor: '#FFF4CE',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '800', color: '#9A6700' },
  statusGood: { backgroundColor: '#E8F5EE' },
  statusBad: { backgroundColor: '#FDECEA' },
  statusWarning: { backgroundColor: '#FFF4CE' },
  statusGoodText: { color: colors.success },
  statusBadText: { color: colors.danger },
  statusWarningText: { color: '#9A6700' },
  fieldLabel: { fontSize: 13, color: colors.ink, fontWeight: '700' },
  choiceGroup: { gap: 8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: colors.white,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.paleBlue,
  },
  choiceText: { fontSize: 13, color: colors.ink },
  choiceTextSelected: { fontWeight: '700', color: colors.primaryDark },
  emptyChoice: { fontSize: 13, color: colors.muted },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  iconAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.paleBlue,
  },
  iconActionDanger: { backgroundColor: '#FDECEA' },
  iconActionDisabled: { opacity: 0.45 },
  carImagePreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: colors.canvas,
  },
});

export default CustomerAssetsScreen;
