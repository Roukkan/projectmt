import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  TextInput,
  FlatList,
  Alert,
  Switch,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import {
  logReminderStatus,
  updateReminderStatus,
  getUserRole,
  getCurrentUser,
  databases,
} from "../../lib/appwrite";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../../components/customButton";

export default function Home() {
  const [reminders, setReminders] = useState([]);
  const [name, setName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [interval, setInterval] = useState("");
  const [startTime, setStartTime] = useState(new Date());
  const [intervalStartTime, setIntervalStartTime] = useState(new Date());
  const [isIntervalMode, setIsIntervalMode] = useState(true);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showIntervalStartPicker, setShowIntervalStartPicker] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [role, setRole] = useState("");
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const BACKGROUND_FETCH_TASK = "background-fetch";
  const [reminderMode, setReminderMode] = useState("Fixed Time"); // Default mode
  const [timesPerDay, setTimesPerDay] = useState(0); // Number of times per day
  const [selectedTimes, setSelectedTimes] = useState([]); // To store selected times
  const [timePickerVisible, setTimePickerVisible] = useState(false); // Controls visibility of time picker
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(null);

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    try {
      const reminders = await AsyncStorage.getItem("reminders");
      if (reminders) setReminders(JSON.parse(reminders));
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });

  const fetchYourReminderLogs = async () => {
    try {
      // Replace with your actual DATABASE_ID and COLLECTION_ID
      const response = await databases.listDocuments(
        "66eee534002ecfe1844f",
        "671f855a0002323534ce"
      );
      console.log("Raw response from listDocuments:", response); // Check if response is correct

      // Ensure response.documents is set correctly
      if (response && response.documents) {
        console.log("Fetched logs:", response.documents); // Log fetched logs
        setLogs(response.documents); // Set the logs state
      } else {
        console.error(
          "No documents found or response structure is incorrect:",
          response
        );
        setLogs([]); // Clear logs if no documents found
      }
    } catch (error) {
      console.error("Error fetching reminder logs:", error);
      setError(error); // Set error state
    }
  };

  const fetchReminderLogs = async () => {
    try {
      const logs = await fetchYourReminderLogs(); // Call the fetch function
      console.log("Fetched logs:", logs); // Log the fetched logs

      // If logs are valid, update the state
      if (logs) {
        setReminders(logs);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching reminder logs:", err);
      setError(err);
    }
  };

  useEffect(() => {
    loadReminders();
    fetchReminderLogs();

    const fetchUserData = async () => {
      const user = await getCurrentUser();
      if (user) {
        setRole(user.role); // Assuming role is stored in user object
        if (user.role === "Family") {
          // Fetch reminders for Family role
          const logs = await fetchReminderLogs();
          setReminders(logs); // Set fetched logs
          console.log("Fetched logs:", logs);
        } else if (user.role === "Nurse") {
          // Load reminders from AsyncStorage or other source
          loadReminders();
        }
      }
    };

    fetchUserData();

    const requestNotificationPermission = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Enable notifications for this app."
        );
      } else {
        console.log("Notification permission granted.");
      }
    };

    const registerBackgroundFetch = async () => {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 1 * 60, // Runs every 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      const fetchUserRole = async () => {
        try {
          const userRole = await getUserRole();
          setRole(userRole); // Store role in state
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      };
    };

    registerBackgroundFetch();

    requestNotificationPermission();

    const notificationSubscription =
      Notifications.addNotificationReceivedListener(handleNotification);
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse
      );

    return () => {
      notificationSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const handleNotification = async (notification) => {
    const reminderName = notification.request.content.body.split(": ")[1];
    console.log("Received notification data:", notification);
    setReminders((prevReminders) => {
      const updatedReminders = prevReminders.map((reminder) =>
        reminder.name === reminderName
          ? { ...reminder, isActive: true }
          : reminder
      );
      // Persist reminders to AsyncStorage for background state sync
      AsyncStorage.setItem("reminders", JSON.stringify(updatedReminders));
      return updatedReminders;
    });

    Alert.alert("Reminder", notification.request.content.body);
  };

  const handleNotificationResponse = (response) => {
    const logId = response.notification.request.content.data.logId; // Access logId from notification data

    if (!logId) {
      console.error("No valid logId found in notification data.");
      return;
    }

    setReminders((prevReminders) =>
      prevReminders.map((reminder) =>
        reminder.logId === logId ? { ...reminder, isActive: false } : reminder
      )
    );

    // Update reminder status in the Appwrite database
    updateReminderStatus(logId, "Done").catch((error) =>
      console.error("Error updating reminder status:", error)
    );
  };

  const scheduleNotification = async (
    name,
    patientName,
    interval,
    startTime,
    intervalStartTime,
    isIntervalMode,
    logId // Added logId parameter
  ) => {
    const triggerTime = isIntervalMode ? intervalStartTime : startTime;

    if (!triggerTime || !(triggerTime instanceof Date)) {
      console.error("Invalid trigger time for notification.");
      return;
    }

    try {
      if (isIntervalMode) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Medicine Reminder",
            body: `Patient: ${patientName}, It's time to take your medicine: ${name}`,
            data: { logId }, // Include logId in notification data
            sound: true,
          },
          trigger: { seconds: interval * 60 * 60, repeats: true },
        });
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Medicine Reminder",
            body: `Patient: ${patientName}, It's time to take your medicine: ${name}`,
            data: { logId }, // Include logId in notification data
            sound: true,
          },
          trigger: {
            hour: startTime.getHours(),
            minute: startTime.getMinutes(),
            repeats: true,
          },
        });
      }
      console.log("Notification scheduled successfully.");
    } catch (error) {
      console.error("Error scheduling notification:", error);
    }
  };

  const saveReminder = async () => {
    if (
      !name ||
      !patientName ||
      (!interval && isIntervalMode) ||
      (!startTime && !isIntervalMode)
    ) {
      Alert.alert("Validation", "Please fill in all fields.");
      return;
    }

    const newReminder = isIntervalMode
      ? {
          name,
          patientName,
          interval: parseInt(interval),
          intervalStartTime:
            intervalStartTime instanceof Date ? intervalStartTime : new Date(),
          type: "interval",
          isActive: false,
        }
      : {
          name,
          patientName,
          startTime: startTime instanceof Date ? startTime : new Date(), // Ensure startTime is a Date object
          type: "fixed",
          isActive: false,
        };

    try {
      // Create a log for the reminder in Appwrite and store the log ID
      const logId = await logReminderStatus({
        name: newReminder.name,
        patientName: newReminder.patientName,
        status: "Pending",
      });

      // Check if logId is valid
      if (!logId) {
        throw new Error("Failed to retrieve logId from logReminderStatus");
      }

      // Add the log ID to the reminder object
      const reminderWithLogId = { ...newReminder, logId };

      // Save the reminder as before
      if (editingIndex !== null) {
        const updatedReminders = reminders.map((reminder, index) =>
          index === editingIndex ? reminderWithLogId : reminder
        );
        setReminders(updatedReminders);
        await AsyncStorage.setItem(
          "reminders",
          JSON.stringify(updatedReminders)
        );
        setEditingIndex(null);
      } else {
        const updatedReminders = [...reminders, reminderWithLogId];
        setReminders(updatedReminders);
        await AsyncStorage.setItem(
          "reminders",
          JSON.stringify(updatedReminders)
        );
      }

      // Schedule the notification with the new reminder data
      await scheduleNotification(
        reminderWithLogId.name,
        reminderWithLogId.patientName,
        reminderWithLogId.interval,
        reminderWithLogId.startTime,
        reminderWithLogId.intervalStartTime,
        isIntervalMode,
        logId // Pass logId to the scheduleNotification function
      );

      resetForm();
      setModalVisible(false);
    } catch (error) {
      console.error("Failed to save reminder:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setPatientName("");
    setInterval("");
    setStartTime(new Date());
    setIntervalStartTime(new Date());
    setEditingIndex(null);
  };

  const loadReminders = async () => {
    const storedReminders = await AsyncStorage.getItem("reminders");
    if (storedReminders) {
      setReminders(JSON.parse(storedReminders));
    }
  };

  const deleteReminder = async (index) => {
    const updatedReminders = reminders.filter((_, i) => i !== index);
    setReminders(updatedReminders);
    await AsyncStorage.setItem("reminders", JSON.stringify(updatedReminders));
  };

  const editReminder = (index) => {
    if (index < 0 || index >= reminders.length) {
      console.error("Invalid index:", index);
      return;
    }

    const reminderToEdit = reminders[index];

    if (!reminderToEdit) {
      console.error("No reminder found at index:", index);
      return;
    }

    setName(reminderToEdit.name);
    setPatientName(reminderToEdit.patientName);

    if (reminderToEdit.type === "interval") {
      setIsIntervalMode(true);
      setInterval(reminderToEdit.interval.toString());
      setIntervalStartTime(
        new Date(`1970-01-01T${reminderToEdit.intervalStartTime}:00`)
      );
    } else {
      setIsIntervalMode(false);
      setStartTime(new Date(`1970-01-01T${reminderToEdit.startTime}:00`));
    }

    setEditingIndex(index);
    setModalVisible(true);
  };

  const handleDonePress = async (reminder, index) => {
    try {
      if (!reminder.logId) {
        console.warn("No logId found for this reminder:", reminder);
        return;
      }
      console.log("Marking reminder as done for logId:", reminder.logId);
      await updateReminderStatus(reminder.logId, "Done");

      // Ensure prevReminders is defined as an array
      setReminders((prevReminders) => {
        const updatedReminders = (prevReminders || []).map((rem, i) =>
          i === index ? { ...rem, isActive: false } : rem
        );
        AsyncStorage.setItem("reminders", JSON.stringify(updatedReminders));
        return updatedReminders;
      });

      console.log("Reminder marked as done successfully.");
    } catch (error) {
      console.error("Failed to update reminder status:", error);
    }
  };

  const renderReminder = ({ item, index }) => (
    <View className="pt-2 pb-2 px-5 bg-white rounded-lg shadow-md mb-5">
      <Text className="font-pregular text-xl">Patient: {item.patientName}</Text>
      <Text className="font-pregular text-lg">Medicine: {item.name}</Text>
      <Text>
        {item.type === "interval"
          ? `Interval: ${item.interval} hrs`
          : `Start Time: ${formatTo12Hour(item.startTime)}`}
      </Text>
      <View className="flex-row justify-between mt-2.5 pt-2">
        {role === "Nurse" && (
          <>
            <Button title="Edit" onPress={() => editReminder(index)} />
            <Button
              title="Delete"
              color="red"
              onPress={() => deleteReminder(index)}
            />
          </>
        )}
        <Button
          title={item.isActive ? "Mark as Done" : "Pending"}
          color={item.isActive ? "green" : "gray"}
          onPress={() => handleDonePress(item, index)}
          disabled={!item.isActive}
        />
      </View>
    </View>
  );

  const handleTimeChange = (_, selectedTime) => {
    const currentTime = selectedTime || startTime;
    setShowTimePicker(false);
    setStartTime(currentTime);
  };

  const handleIntervalStartChange = (_, selectedTime) => {
    const currentTime = selectedTime || intervalStartTime;
    setShowIntervalStartPicker(false);
    setIntervalStartTime(currentTime);
  };

  function formatTo12Hour(dateString) {
    const date = new Date(dateString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";

    // Convert 24-hour time to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // The hour '0' should be '12'

    // Pad single-digit minutes with a leading zero
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;

    // Format the date as YYYY-MM-DD HH:MM AM/PM
    return `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date
      .getDate()
      .toString()
      .padStart(2, "0")} ${hours}:${minutesStr} ${ampm}`;
  }

  const handleAddButtonPress = () => {
    // Clear out the text input values first
    setName("");
    setInterval("");
    setStartTime(new Date());

    // Then open the modal
    setModalVisible(true);
  };

  return (
    <SafeAreaView className="flex-1">
      <Text className="justify-center text-2xl font-bold mb-5 pt-10 text-center">
        {role === "Family" ? "Reminder Logs" : "Reminders"}
      </Text>

      {role === "Family" ? (
        // Render logs for Family role
        <FlatList
          data={logs} // Changed from reminders to reminderLogs
          renderItem={({ item }) => (
            <View className="pt-5 pb-5 px-5 bg-white rounded-lg shadow-md mb-5">
              <Text className="hidden">Log ID: {item.$id}</Text>
              <Text className="font-pregular text-lg">Name: {item.name}</Text>
              <Text className="font-pregular text-lg">
                Patient: {item.patientName}
              </Text>
              <Text className="font-pregular text-lg">
                Action: {item.action}
              </Text>
              <Text className="font-pregular text-lg">
                Date: {new Date(item.$createdAt).toLocaleString()}
              </Text>
            </View>
          )}
          keyExtractor={(item) =>
            item.$id ? item.$id : Math.random().toString()
          } // Ensure unique key
        />
      ) : (
        // Render standard reminders for other roles (including Nurse)
        <View className="p-5 flex-1">
          {role === "Nurse" && (
            <View className="absolute bottom-0 right-0 z-10">
              <TouchableOpacity
                className="bg-secondary rounded-full w-10 h-10 p-1 m-1"
                onPress={() => handleAddButtonPress()}
              >
                <Text className="text-white text-4xl justify-center text-center">
                  +
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            className="p-2"
            data={reminders} // Keep this as reminders for other roles
            renderItem={renderReminder}
            keyExtractor={(item) =>
              item.$id ? item.$id : Math.random().toString()
            } // Ensure unique key
          />
        </View>
      )}

      {/* <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <View
            style={{
              width: 300,
              padding: 20,
              backgroundColor: "white",
              borderRadius: 10,
            }}
          >
            <TextInput
              placeholder="Patient Name"
              value={patientName}
              onChangeText={setPatientName}
              className="text-lg border-b-2 border-gray-300 mb-5 pt-5 font-pregular"
            />
            <TextInput
              placeholder="Medicine Name"
              value={name}
              onChangeText={setName}
              className="text-lg border-b-2 border-gray-300 mb-5 pt-5 font-pregular"
            />
            <View className="flex-row items-center">
              <Text className="text-lg mr-3">Fixed Time</Text>
              <Switch
                value={isIntervalMode}
                onValueChange={setIsIntervalMode}
                className="pt-4 pb-4 ml-2 scale-x-125"
              />
              <Text className="text-lg ml-10 pl-5">Interval</Text>
            </View>
            {isIntervalMode ? (
              <>
                <TextInput
                  placeholder="Interval in hours"
                  value={interval}
                  onChangeText={setInterval}
                  keyboardType="numeric"
                  className="text-lg border-b-2 border-gray-300 mb-5 pt-5 font-pregular"
                />

                <TouchableOpacity
                  onPress={() => setShowIntervalStartPicker(true)}
                  className="pt-4 pb-4 mt-5 mb-1 bg-blue-500 rounded-md items-center justify-center"
                >
                  <Text className="text-white text-lg">
                    Select Interval Start Time
                  </Text>
                </TouchableOpacity>
                {showIntervalStartPicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={handleIntervalStartChange}
                  />
                )}
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  className="pt-4 pb-4 mt-5 mb-1 bg-blue-500 rounded-md items-center justify-center"
                >
                  <Text className="text-white text-lg">Select Time</Text>
                </TouchableOpacity>

                {showTimePicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="time"
                    is24Hour={false}
                    display="spinner"
                    onChange={handleTimeChange}
                  />
                )}
              </>
            )}

            <TouchableOpacity
              onPress={saveReminder}
              className="pt-4 pb-4 mt-5 mb-1 bg-blue-500 rounded-md items-center justify-center"
            >
              <Text className="text-white text-lg">Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="pt-4 pb-4 mt-1 mb-2 bg-tertiary rounded-md items-center justify-center"
            >
              <Text className="text-white text-lg">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
       */}

      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <View
            style={{
              width: 300,
              padding: 20,
              backgroundColor: "white",
              borderRadius: 10,
            }}
          >
            <TextInput
              placeholder="Patient Name"
              value={patientName}
              onChangeText={setPatientName}
              className="text-lg border-b-2 border-gray-300 mb-5 pt-5 font-pregular"
            />
            <TextInput
              placeholder="Medicine Name"
              value={name}
              onChangeText={setName}
              className="text-lg border-b-2 border-gray-300 mb-5 pt-5 font-pregular"
            />

            {/* Mode Selection */}
            <View style={{ marginBottom: 20 }}>
              <Text className="text-lg mb-2">Select Reminder Mode</Text>
              <View
                style={{ flexDirection: "row", justifyContent: "space-around" }}
              >
                <TouchableOpacity onPress={() => setReminderMode("Fixed Time")}>
                  <Text
                    style={{
                      color: reminderMode === "Fixed Time" ? "blue" : "black",
                      fontWeight:
                        reminderMode === "Fixed Time" ? "bold" : "normal",
                    }}
                  >
                    Fixed Time
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setReminderMode("Interval")}>
                  <Text
                    style={{
                      color: reminderMode === "Interval" ? "blue" : "black",
                      fontWeight:
                        reminderMode === "Interval" ? "bold" : "normal",
                    }}
                  >
                    Interval
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setReminderMode("Times per Day")}
                >
                  <Text
                    style={{
                      color:
                        reminderMode === "Times per Day" ? "blue" : "black",
                      fontWeight:
                        reminderMode === "Times per Day" ? "bold" : "normal",
                    }}
                  >
                    Times per Day
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Conditional Rendering Based on Selected Mode */}
            {reminderMode === "Fixed Time" && (
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                className="pt-4 pb-4 mt-5 mb-1 bg-blue-500 rounded-md items-center justify-center"
              >
                <Text className="text-white text-lg">Select Fixed Time</Text>
              </TouchableOpacity>
            )}

            {reminderMode === "Interval" && (
              <>
                <TextInput
                  placeholder="Interval in hours"
                  value={interval}
                  onChangeText={setInterval}
                  keyboardType="numeric"
                  className="text-lg border-b-2 border-gray-300 mb-5 pt-5 font-pregular"
                />
                <TouchableOpacity
                  onPress={() => setShowIntervalStartPicker(true)}
                  className="pt-4 pb-4 mt-5 mb-1 bg-blue-500 rounded-md items-center justify-center"
                >
                  <Text className="text-white text-lg">
                    Select Interval Start Time
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {reminderMode === "Times per Day" && (
              <>
                <TextInput
                  placeholder="Number of Times per Day"
                  value={timesPerDay.toString()}
                  onChangeText={(text) => setTimesPerDay(parseInt(text) || 0)}
                  keyboardType="numeric"
                  className="text-lg border-b-2 border-gray-300 mb-5 pt-5 font-pregular"
                />
                {Array.from({ length: timesPerDay || 0 }).map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSelectedTimeIndex(index); // Set the index to be updated
                      setTimePickerVisible(true); // Show the time picker
                    }}
                    className="pt-4 pb-4 mt-1 mb-1 bg-blue-500 rounded-md items-center justify-center"
                  >
                    <Text className="text-white text-lg">{`Select Time ${
                      index + 1
                    }`}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* DateTimePicker for Fixed Time and Interval Start */}
            {showTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleTimeChange}
              />
            )}
            {showIntervalStartPicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleIntervalStartChange}
              />
            )}
            {timePickerVisible && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleTimeChange}
              />
            )}

            {/* Save and Cancel Buttons */}
            <TouchableOpacity
              onPress={saveReminder}
              className="pt-4 pb-4 mt-5 mb-1 bg-blue-500 rounded-md items-center justify-center"
            >
              <Text className="text-white text-lg">Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="pt-4 pb-4 mt-1 mb-2 bg-tertiary rounded-md items-center justify-center"
            >
              <Text className="text-white text-lg">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
