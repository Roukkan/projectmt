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

export async function createUser(email, password, username) {
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
        avatar: avatarUrl,
      }
    );

    return newUser;
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
}

export const signIn = async (email, password) => {
  // try {
  //   const session = await account.createEmailPasswordSession(email, password);

  //   return session;
  // } catch (error) {
  //   throw new Error(error);
  // }

  try {
    // Check if a session is already active
    const currentSession = await account.get();

    if (currentSession) {
      // Session already exists, return the active session
      return currentSession;
    }
  } catch (error) {
    // If error occurs, it means there's no active session, proceed with login
    if (error.code !== 404) {
      // 404 error means no active session found
      throw new Error(error.message);
    }
  }

  // Create a new session if no session exists
  try {
    const session = await account.createEmailPasswordSession(email, password);
    return session;
  } catch (error) {
    throw new Error(error.message);
  }
};

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
