import {
  Account,
  Avatars,
  Client,
  Databases,
  ID,
  Query,
} from "react-native-appwrite";

const config = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.Med.Tracker",
  projectId: "66eee3d10022cfa82880",
  databaseId: "66eee534002ecfe1844f",
  userCollectionId: "66eee55300220477e7cd",
  recordCollectionId: "66eee57b00198b9706f3",
  storageId: "66eee6ad000c76d54623",
  reminderLogsCollectionId: "671f855a0002323534ce",
};

// Init your React Native SDK
const client = new Client();

client
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setPlatform(config.platform);

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
// export { client, databases };
console.log("Databases object:", databases);
console.log("Client initialized:", client);

export { client, account, databases };

export async function createUser(email, password, username, role, contactNo) {
  try {
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username
    );

    if (!newAccount) {
      throw new Error("Failed to create user account");
    }

    const avatarUrl = avatars.getInitials(username);

    await signIn(email, password);

    const newUser = await databases.createDocument(
      config.databaseId,
      config.userCollectionId,
      ID.unique(),
      {
        accountId: newAccount.$id,
        email: email,
        username: username,
        role: role,
        contactNo: contactNo,
        avatar: avatarUrl,
      }
    );

    return newUser;
  } catch (error) {
    throw new Error(error);
  }
}

export async function signIn(email, password) {
  try {
    const session = await account.createEmailPasswordSession(email, password);

    return session;
  } catch (error) {
    throw new Error(error);
  }
}

export async function getAccount() {
  try {
    const currentAccount = await account.get();

    return currentAccount;
  } catch (error) {
    throw new Error(error);
  }
}

export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get();

    if (!currentAccount) throw Error;

    const currentUser = await databases.listDocuments(
      config.databaseId,
      config.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (!currentUser) throw Error;

    return currentUser.documents[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};

// Save a new reminder log
export async function logReminderStatus(reminderData) {
  try {
    const log = await databases.createDocument(
      config.databaseId,
      config.reminderLogsCollectionId,
      ID.unique(),
      {
        name: reminderData.name,
        patientName: reminderData.patientName,
        action: "Pending",
      }
    );
    return log.$id;
  } catch (error) {
    console.error("Error creating reminder log:", error);
    throw new Error("Failed to create reminder log");
  }
}

// Update a reminder log (e.g., marking it as 'Done')
export async function updateReminderStatus(logId, newStatus) {
  try {
    console.log(
      `Attempting to update reminder log with ID: ${logId}, to status: ${newStatus}`
    );
    await databases.updateDocument(
      config.databaseId,
      config.reminderLogsCollectionId,
      logId,
      {
        action: newStatus,
      }
    );
    console.log("Reminder status updated successfully.");
  } catch (error) {
    console.error("Error updating reminder status:", error);
    throw new Error("Failed to update reminder status");
  }
}

// Example of saving and updating reminders with logs
export const saveReminder = async (reminderData, editingIndex = null) => {
  try {
    const logId = await logReminderStatus(reminderData);

    if (editingIndex !== null) {
      // Update existing reminder if editing
      // Additional logic for updating reminders
    } else {
      // Add a new reminder with the log ID attached
      const newReminder = {
        ...reminderData,
        logId: logId, // Attach the log ID for later updates
      };
      console.log("New reminder saved:", newReminder);
    }
  } catch (error) {
    console.error("Error saving reminder:", error);
    throw new Error("Failed to save reminder");
  }
};

// Example function to mark a reminder as done
export const markReminderAsDone = async (logId) => {
  try {
    await updateReminderStatus(logId, "Done");
  } catch (error) {
    console.error("Error marking reminder as done:", error);
  }
};

export const getUserRole = async () => {
  try {
    // Step 1: Get the current user account
    const currentAccount = await account.get();

    if (!currentAccount) {
      throw new Error("No active user session found");
    }

    // Step 2: Query the user's document to get role
    const userDocuments = await databases.listDocuments(
      config.databaseId,
      config.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    // Ensure that a document was returned
    if (userDocuments.documents.length === 0) {
      throw new Error("User document not found");
    }

    // Step 3: Extract and return the role
    const userDocument = userDocuments.documents[0];
    const role = userDocument.role; // Adjust field name as needed

    return role;
  } catch (error) {
    console.error("Error fetching user role:", error);
    throw new Error("Failed to fetch user role");
  }
};

export async function logout() {
  try {
    // Delete the current session to log the user out
    await account.deleteSession("current");
    console.log("User has been logged out successfully.");
  } catch (error) {
    console.error("Error logging out:", error);
    throw new Error("Failed to log out");
  }
}
