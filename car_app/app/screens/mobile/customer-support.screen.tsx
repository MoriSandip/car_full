import React, {useState} from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {
  ActionButton,
  Card,
  colors,
  InfoMessage,
  LoadingSkeleton,
  Page,
  PageTitle,
  TextField,
} from '../../components/mobile/ui';
import {
  CustomerSupportTicket,
  useCreateSupportTicketMutation,
  useGetMySupportTicketQuery,
  useGetMySupportTicketsQuery,
  useReplyToSupportTicketMutation,
} from '../../store/customer.api';

const categories: CustomerSupportTicket['category'][] = [
  'Booking',
  'Payment',
  'Service quality',
  'Membership',
  'Other',
];

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const statusLabel = (status: CustomerSupportTicket['status']) =>
  status === 'InProgress' ? 'In progress' : status;

const CustomerSupportScreen = () => {
  const [selectedId, setSelectedId] = useState('');
  const [createVisible, setCreateVisible] = useState(false);
  const [category, setCategory] =
    useState<CustomerSupportTicket['category']>('Booking');
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [reply, setReply] = useState('');
  const [actionError, setActionError] = useState('');
  const ticketsQuery = useGetMySupportTicketsQuery();
  const ticketQuery = useGetMySupportTicketQuery(selectedId, {
    skip: !selectedId,
  });
  const [createTicket, createState] = useCreateSupportTicketMutation();
  const [replyToTicket, replyState] = useReplyToSupportTicketMutation();
  const tickets = ticketsQuery.data?.data ?? [];
  const ticket = ticketQuery.data?.data;

  const submitTicket = async () => {
    setActionError('');
    try {
      const result = await createTicket({
        category,
        subject: subject.trim(),
        message: initialMessage.trim(),
      }).unwrap();
      setSelectedId(result.data._id);
      setSubject('');
      setInitialMessage('');
      setCreateVisible(false);
    } catch (error) {
      const response = error as {data?: {message?: string}};
      setActionError(
        response.data?.message || 'Could not submit your ticket. Please retry.',
      );
    }
  };

  const submitReply = async () => {
    if (!selectedId || !reply.trim()) return;
    setActionError('');
    try {
      await replyToTicket({id: selectedId, message: reply.trim()}).unwrap();
      setReply('');
    } catch (error) {
      const response = error as {data?: {message?: string}};
      setActionError(
        response.data?.message || 'Could not send your reply. Please retry.',
      );
    }
  };

  const refresh = () => {
    if (selectedId) {
      ticketQuery.refetch();
    } else {
      ticketsQuery.refetch();
    }
  };

  return (
    <Page
      refreshControl={
        <RefreshControl
          refreshing={
            selectedId ? ticketQuery.isFetching : ticketsQuery.isFetching
          }
          onRefresh={refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      headerAction={
        selectedId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to support tickets"
            onPress={() => {
              setSelectedId('');
              setActionError('');
            }}
            style={styles.headerAction}>
            <Feather name="arrow-left" size={19} color={colors.primary} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a support ticket"
            onPress={() => setCreateVisible(true)}
            style={styles.headerAction}>
            <Feather name="plus" size={20} color={colors.primary} />
          </Pressable>
        )
      }>
      {selectedId ? (
        <>
          {ticketQuery.isLoading ? (
            <LoadingSkeleton rows={2} />
          ) : ticketQuery.isError || !ticket ? (
            <InfoMessage
              text="Could not load this ticket. Pull down to retry."
              variant="error"
            />
          ) : (
            <>
              <PageTitle
                title={ticket.subject}
                subtitle={`${ticket.ticketNo} · ${ticket.category} · ${statusLabel(ticket.status)}`}
              />
              {actionError ? (
                <InfoMessage text={actionError} variant="error" />
              ) : null}
              <View style={styles.messageList}>
                {ticket.messages.map(message => (
                  <Card
                    key={message._id}
                    style={[
                      styles.messageCard,
                      message.senderRole === 'CUSTOMER'
                        ? styles.customerMessage
                        : styles.adminMessage,
                    ]}>
                    <View style={styles.messageMeta}>
                      <Text style={styles.messageSender}>
                        {message.senderRole === 'CUSTOMER'
                          ? 'You'
                          : 'Support team'}
                      </Text>
                      <Text style={styles.messageDate}>
                        {formatDate(message.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.messageText}>{message.message}</Text>
                  </Card>
                ))}
              </View>
              {ticket.status === 'Closed' ? (
                <InfoMessage text="This ticket is closed. Create a new ticket if you still need help." />
              ) : (
                <Card style={styles.replyCard}>
                  <Text style={styles.sectionTitle}>Add a reply</Text>
                  <TextField
                    accessibilityLabel="Your reply"
                    placeholder="Write your reply..."
                    value={reply}
                    onChangeText={setReply}
                    multiline
                    maxLength={4000}
                    textAlignVertical="top"
                    style={styles.textArea}
                  />
                  <ActionButton
                    title={replyState.isLoading ? 'Sending...' : 'Send reply'}
                    onPress={submitReply}
                    disabled={replyState.isLoading || !reply.trim()}
                  />
                  {ticket.status === 'Resolved' ? (
                    <Text style={styles.hint}>
                      Replying will reopen this resolved ticket.
                    </Text>
                  ) : null}
                </Card>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <PageTitle
            title="Complaints & Support"
            subtitle="Create a support request and follow its replies."
          />
          {ticketsQuery.isError ? (
            <InfoMessage
              text="Could not load your support tickets. Pull down to retry."
              variant="error"
            />
          ) : ticketsQuery.isLoading ? (
            <LoadingSkeleton rows={3} />
          ) : tickets.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Feather name="life-buoy" size={24} color={colors.primary} />
              <Text style={styles.emptyTitle}>No tickets yet</Text>
              <Text style={styles.emptyCopy}>
                Need help with a wash or your account? Start a support request.
              </Text>
              <ActionButton
                title="Create a ticket"
                onPress={() => setCreateVisible(true)}
              />
            </Card>
          ) : (
            <View style={styles.ticketList}>
              {tickets.map(item => (
                <Pressable
                  key={item._id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.subject}, ${statusLabel(item.status)}`}
                  onPress={() => setSelectedId(item._id)}>
                  <Card style={styles.ticketCard}>
                    <View style={styles.ticketHeading}>
                      <Text style={styles.ticketSubject}>{item.subject}</Text>
                      <Text style={styles.ticketStatus}>
                        {statusLabel(item.status)}
                      </Text>
                    </View>
                    <Text style={styles.ticketMeta}>
                      {item.ticketNo} · {item.category}
                    </Text>
                    <Text style={styles.ticketDate}>
                      Updated {formatDate(item.lastMessageAt)}
                    </Text>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}
          {tickets.length > 0 ? (
            <ActionButton
              title="Create a ticket"
              onPress={() => setCreateVisible(true)}
              style={styles.createButton}
            />
          ) : null}
        </>
      )}

      <Modal
        visible={createVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New support ticket</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close new ticket form"
                onPress={() => setCreateVisible(false)}>
                <Feather name="x" size={21} color="#172B3A" />
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryList}>
              {categories.map(item => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{selected: category === item}}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.categoryChip,
                    category === item && styles.categoryChipSelected,
                  ]}>
                  <Text
                    style={[
                      styles.categoryText,
                      category === item && styles.categoryTextSelected,
                    ]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextField
              accessibilityLabel="Ticket subject"
              placeholder="What do you need help with?"
              value={subject}
              onChangeText={setSubject}
              maxLength={120}
            />
            <Text style={styles.fieldLabel}>Message</Text>
            <TextField
              accessibilityLabel="Describe your issue"
              placeholder="Share the details..."
              value={initialMessage}
              onChangeText={setInitialMessage}
              multiline
              maxLength={4000}
              textAlignVertical="top"
              style={styles.textArea}
            />
            {actionError ? (
              <InfoMessage text={actionError} variant="error" />
            ) : null}
            <ActionButton
              title={createState.isLoading ? 'Submitting...' : 'Submit ticket'}
              onPress={submitTicket}
              disabled={
                createState.isLoading ||
                subject.trim().length < 4 ||
                initialMessage.trim().length < 2
              }
            />
          </View>
        </View>
      </Modal>
    </Page>
  );
};

const styles = StyleSheet.create({
  headerAction: {
    alignItems: 'center',
    backgroundColor: '#E6F3F4',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  messageList: {gap: 12},
  messageCard: {padding: 14, width: '92%'},
  customerMessage: {alignSelf: 'flex-end', backgroundColor: '#E6F3F4'},
  adminMessage: {alignSelf: 'flex-start'},
  messageMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  messageSender: {color: '#172B3A', fontSize: 12, fontWeight: '700'},
  messageDate: {color: colors.muted, fontSize: 10},
  messageText: {color: '#172B3A', fontSize: 14, lineHeight: 20},
  replyCard: {gap: 12, marginTop: 16},
  sectionTitle: {color: '#172B3A', fontSize: 16, fontWeight: '700'},
  textArea: {minHeight: 96, paddingTop: 12},
  hint: {color: colors.muted, fontSize: 12},
  emptyCard: {alignItems: 'center', gap: 12, padding: 22},
  emptyTitle: {color: '#172B3A', fontSize: 17, fontWeight: '700'},
  emptyCopy: {color: colors.muted, lineHeight: 20, textAlign: 'center'},
  ticketList: {gap: 12},
  ticketCard: {gap: 8, padding: 16},
  ticketHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  ticketSubject: {color: '#172B3A', flex: 1, fontSize: 15, fontWeight: '700'},
  ticketStatus: {color: colors.primary, fontSize: 11, fontWeight: '700'},
  ticketMeta: {color: colors.muted, fontSize: 12},
  ticketDate: {color: colors.muted, fontSize: 11},
  createButton: {marginTop: 16},
  modalBackdrop: {
    backgroundColor: 'rgba(23, 43, 58, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
    maxHeight: '90%',
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {color: '#172B3A', fontSize: 18, fontWeight: '700'},
  fieldLabel: {color: '#172B3A', fontSize: 13, fontWeight: '600'},
  categoryList: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  categoryChip: {
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#E6F3F4',
    borderColor: colors.primary,
  },
  categoryText: {color: colors.muted, fontSize: 12},
  categoryTextSelected: {color: colors.primary, fontWeight: '700'},
});

export default CustomerSupportScreen;
