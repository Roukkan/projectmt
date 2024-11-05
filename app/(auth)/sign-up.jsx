import { Alert, Image, ScrollView, Text, View } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../../constants";
import FormField from "../../components/formField";
import CustomButton from "./../../components/customButton";
import { Link, router } from "expo-router";
import { createUser } from "../../lib/appwrite";
import { useGlobalContext } from "../../context/GlobalProvider";
import { SelectList } from "react-native-dropdown-select-list";

const SignUp = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUser, setIsLogged } = useGlobalContext();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "",
    contactNo: "",
  });

  const data = [
    { label: "Family", value: "Family" },
    { label: "Caregiver / Nurse", value: "Nurse" },
  ];

  const submit = async () => {
    if (
      !form.username ||
      !form.email ||
      !form.password ||
      !form.role ||
      !form.contactNo
    ) {
      Alert.alert("Error", "Please fill in all the fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createUser(
        form.email,
        form.password,
        form.username,
        form.role,
        form.contactNo
      );
      setUser(result);
      setIsLogged(true);

      router.replace("/home");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView>
        <View className="w-full justify-center min-h-[85vh] px-4 my-6">
          <Image
            source={images.logo}
            resizeMode="contain"
            className="w-[500px] h-[140px] -pb-20 -mb-20"
          />

          <Text className="text-2xl text-primary text-semibold font-psemibold mt-10">
            Sign Up
          </Text>

          <FormField
            title="Full Name"
            value={form.username}
            handleChangeText={(e) => setForm({ ...form, username: e })}
            otherStyles="mt-10"
          />

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            otherStyles="mt-7"
            keyboardType="email-address"
          />

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            otherStyles="mt-7"
          />

          <FormField
            title="Role"
            value={form.role}
            handleChangeText={(e) => setForm({ ...form, role: e })}
            otherStyles="mt-7 hidden"
          />

          <Text className="mt-7 text-base text-primary font-pmedium">Role</Text>
          <View className="mt-2">
            <SelectList
              setSelected={(val) => setForm({ ...form, role: val })}
              data={data}
              save="value"
              placeholder="Select a role"
              searchPlaceholder="Search roles..."
              boxStyles={{
                borderWidth: 2,
                borderRadius: 10,
                marginTop: 10,
                width: "100%",
                backgroundColor: "#e5e7eb",
                borderColor: "#CDCDE0",
              }}
              inputStyles={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 17,
                fontFamily: "Poppins-Regular",
                fontWeight: "700",
                marginLeft: -20,
              }}
              dropdownStyles={{ maxHeight: 150 }}
              dropdownItemStyles={{ fontSize: 20 }}
              dropdownTextStyles={{ fontSize: 20 }}
            />
          </View>

          <FormField
            title="Mobile Number"
            value={form.contactNo}
            handleChangeText={(e) => setForm({ ...form, contactNo: e })}
            otherStyles="mt-7"
          />

          <CustomButton
            title="Sign Up"
            handlePress={submit}
            containerStyles="mt-9"
            isLoading={isSubmitting}
          />

          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-primary font-pregular">
              Have an account already?
            </Text>
            <Link
              href="/sign-in"
              className="text-lg font-psemibold text-tertiary"
            >
              Sign In
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;
