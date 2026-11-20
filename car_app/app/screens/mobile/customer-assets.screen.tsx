import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {launchImageLibrary, type Asset} from 'react-native-image-picker';
import {
  ActionButton,
  Card,
  colors,
  InfoMessage,
  LoadingMessage,
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
  useUpdateCustomerCarMutation,
  useUpdateCustomerFlatMutation,
} from '../../store/customer.api';
import {Car, Flat, RelatedEntity, Society} from '../../store/types';
import {useAppSelector} from '../../store/hooks';

type Section = 'society' | 'flat' | 'car';

const errorText = (error: unknown) => {
  const value = error as {data?: {message?: string}; message?: string};
  return value.data?.message || value.message || 'Request could not be completed.';
};

const uploadCarImage = async (asset: Asset) => {
  if (!asset.base64 || !asset.type?.match(/^image\/(jpeg|png|webp)$/)) {
    throw new Error('Choose a JPEG, PNG, or WebP car image.');
  }
  if (asset.base64.length > 7_000_000) {
    throw new Error('Car image must be 5 MB or smaller.');
  }

  const body = new FormData();
  body.append('image', asset.base64);
  const response = await fetch(
    'https://api.imgbb.com/1/upload?key=1bdaaa38f74328b09cbb9edd361599b8',
    {method: 'POST', body},
  );
  const result = (await response.json()) as {
    data?: {url?: string};
    error?: {message?: string};
  };
  if (!response.ok || !result.data?.url) {
    throw new Error(result.error?.message || 'Car image upload failed.');
  }
  return result.data.url;
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

const CustomerAssetsScreen = () => {
  const [section, setSection] = useState<Section>('society');
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
  const flatQuery = useGetMyFlatsQuery();
  const carQuery = useGetMyCarsQuery();
  const profileQuery = useGetCustomerProfileQuery();
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
  const isLoading =
    societyQuery.isLoading ||
    flatQuery.isLoading ||
    carQuery.isLoading ||
    profileQuery.isLoading;

  const changeSection = (next: Section) => {
    setSection(next);
    setError('');
    setNotice('');
  };

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
        setImageUploading(true);
        imageUrl = await uploadCarImage(pickedCarImage);
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
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setImageUploading(false);
    }
  };

  const chooseCarImage = async () => {
    setError('');
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: true,
      quality: 0.75,
      maxWidth: 1280,
      maxHeight: 1280,
    });
    if (result.didCancel) return;
    if (result.errorMessage) {
      setError(result.errorMessage);
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
    if (asset.base64.length > 7_000_000) {
      setError('Car image must be 5 MB or smaller.');
      return;
    }
    setPickedCarImage(asset);
    setCarImagePreview(asset.uri);
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
    setSection('flat');
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
    setSection('car');
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

  return (
    <Page>
      <PageTitle
        title="My home & cars"
        subtitle="Register your society, flat, and car. Verification status is shown here."
      />
      {isLoading ? <LoadingMessage text="Loading your registrations..." /> : null}
      {societyQuery.isError || flatQuery.isError || carQuery.isError ? (
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
              flatQuery.refetch();
              carQuery.refetch();
              profileQuery.refetch();
            }}
          />
        </View>
      ) : null}
      <View style={styles.sectionSwitch}>
        {([
          ['society', 'Society'],
          ['flat', 'Flat'],
          ['car', 'Car'],
        ] as const).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{selected: section === value}}
            onPress={() => changeSection(value)}
            style={[styles.sectionButton, section === value && styles.sectionButtonSelected]}>
            <Text style={[styles.sectionButtonText, section === value && styles.sectionButtonTextSelected]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <InfoMessage text={error} variant="error" /> : null}
      {notice ? <InfoMessage text={notice} variant="success" /> : null}

      {section === 'society' ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>Register a society</Text>
            <TextField placeholder="Society name *" value={societyForm.name} onChangeText={name => setSocietyForm({...societyForm, name})} />
            <TextField placeholder="Address *" value={societyForm.address} onChangeText={address => setSocietyForm({...societyForm, address})} />
            <TextField placeholder="City *" value={societyForm.city} onChangeText={city => setSocietyForm({...societyForm, city})} />
            <TextField placeholder="State" value={societyForm.state} onChangeText={state => setSocietyForm({...societyForm, state})} />
            <TextField placeholder="Pincode" value={societyForm.pincode} onChangeText={pincode => setSocietyForm({...societyForm, pincode})} keyboardType="number-pad" />
            <TextField placeholder="Contact person" value={societyForm.contactPerson} onChangeText={contactPerson => setSocietyForm({...societyForm, contactPerson})} />
            <TextField placeholder="Contact phone" value={societyForm.phone} onChangeText={phone => setSocietyForm({...societyForm, phone})} keyboardType="phone-pad" />
            <TextField placeholder="Contact email" value={societyForm.email} onChangeText={email => setSocietyForm({...societyForm, email})} keyboardType="email-address" autoCapitalize="none" />
            <ActionButton title={societyMutation.isLoading ? 'Submitting...' : 'Submit society'} onPress={submitSociety} disabled={societyMutation.isLoading} />
          </Card>
          <View style={styles.list}>
            {societies.length ? societies.map(society => <SocietyCard key={society._id} society={society} />) : <InfoMessage text="No societies registered yet." />}
          </View>
        </>
      ) : null}

      {section === 'flat' ? (
        <>
          <Card>
            <Text style={styles.cardTitle}>{editingFlat ? 'Edit flat' : 'Register a flat'}</Text>
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
            {editingFlat ? <ActionButton title="Cancel edit" variant="secondary" onPress={() => {setEditingFlat(null); setFlatForm(flatDefaults);}} /> : null}
          </Card>
          <View style={styles.list}>
            {flats.length ? flats.map(flat => (
              <FlatCard key={flat._id} flat={flat} onEdit={() => startFlatEdit(flat)} onDelete={() => removeFlat(flat)} busy={flatDeleteMutation.isLoading} />
            )) : <InfoMessage text="No flats registered yet." />}
          </View>
        </>
      ) : null}

      {section === 'car' ? (
        <>
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
            {editingCar ? <ActionButton title="Cancel edit" variant="secondary" onPress={() => {setEditingCar(null); setCarForm(carDefaults); setPickedCarImage(null); setCarImagePreview('');}} /> : null}
          </Card>
          <View style={styles.list}>
            {cars.length ? cars.map(car => (
              <CarCard key={car._id} car={car} onEdit={() => startCarEdit(car)} onDelete={() => removeCar(car)} busy={carDeleteMutation.isLoading} />
            )) : <InfoMessage text="No cars registered yet." />}
          </View>
        </>
      ) : null}
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

const Status = ({value}: {value: string}) => (
  <Text style={[styles.status, value === 'VERIFIED' && styles.statusGood, value === 'REJECTED' && styles.statusBad]}>
    {value}
  </Text>
);

const SocietyCard = ({society}: {society: Society}) => (
  <Card>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{society.name}</Text>
      <Status value={society.status || 'PENDING'} />
    </View>
    <Text style={styles.detail}>{society.address}, {society.city}{society.state ? `, ${society.state}` : ''}</Text>
    {society.verificationNote ? <Text style={styles.note}>Admin note: {society.verificationNote}</Text> : null}
  </Card>
);

const FlatCard = ({flat, onEdit, onDelete, busy}: {flat: Flat; onEdit: () => void; onDelete: () => void; busy: boolean}) => (
  <Card>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{flat.block ? `${flat.block} · ` : ''}{flat.flatNumber}</Text>
      <Status value={flat.verificationStatus || 'PENDING'} />
    </View>
    <Text style={styles.detail}>{label(flat.societyId)} · {flat.flatType || 'Flat'}</Text>
    {flat.verificationNote ? <Text style={styles.note}>Admin note: {flat.verificationNote}</Text> : null}
    <View style={styles.actions}>
      <ActionButton title="Edit" variant="secondary" onPress={onEdit} style={styles.action} />
      <ActionButton title="Delete" variant="danger" onPress={onDelete} disabled={busy} style={styles.action} />
    </View>
  </Card>
);

const CarCard = ({car, onEdit, onDelete, busy}: {car: Car; onEdit: () => void; onDelete: () => void; busy: boolean}) => (
  <Card>
    {car.imageUrl ? <Image source={{uri: car.imageUrl}} style={styles.carImage} /> : null}
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{car.registrationNumber}</Text>
      <Status value={car.verificationStatus || 'PENDING'} />
    </View>
    <Text style={styles.detail}>{car.make} {car.model} · {car.color} · {car.carType}</Text>
    <Text style={styles.detail}>{label(car.societyId)} · {label(car.flatId)}</Text>
    {car.verificationNote ? <Text style={styles.note}>Admin note: {car.verificationNote}</Text> : null}
    <View style={styles.actions}>
      <ActionButton title="Edit" variant="secondary" onPress={onEdit} style={styles.action} />
      <ActionButton title="Delete" variant="danger" onPress={onDelete} disabled={busy} style={styles.action} />
    </View>
  </Card>
);

const label = (value: RelatedEntity) => {
  if (typeof value === 'string') return 'Registered location';
  return [value?.name, value?.block, value?.flatNumber].filter(Boolean).join(' ') || 'Registered location';
};

const styles = StyleSheet.create({
  sectionSwitch: {flexDirection: 'row', gap: 8},
  sectionButton: {flex: 1, minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white},
  sectionButtonSelected: {borderColor: colors.primary, backgroundColor: colors.paleBlue},
  sectionButtonText: {fontSize: 14, color: colors.muted, fontWeight: '700'},
  sectionButtonTextSelected: {color: colors.primaryDark},
  list: {gap: 12},
  cardHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
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
  actions: {flexDirection: 'row', gap: 8},
  action: {flex: 1},
  carImage: {width: '100%', height: 170, borderRadius: 10, backgroundColor: colors.canvas},
  carImagePreview: {width: '100%', height: 190, borderRadius: 12, backgroundColor: colors.canvas},
});

export default CustomerAssetsScreen;
