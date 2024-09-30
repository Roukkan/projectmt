import { View, Text, TextInput, Image, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { icons } from "../constants";

const SearchInput = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  ...props
}) => {
  return (
    <View
      className="border-2 items-center flex-row border-black-200 w-full h-16 px-4 bg-black-100 rounded-2xl
     focus:border-secondary space-x-4"
    >
      <TextInput
        className="text-base mt-0.1 text-white flex-1 font-pregular pb-4"
        value={value}
        placeholder="Search for a video topic"
        placeholderTextColor="#7B7B8B"
        onChangeText={handleChangeText}
        {...props}
      />
      <TouchableOpacity>
        <Image source={icons.search} className="w-5 h-5" resizeMode="contain" />
      </TouchableOpacity>
    </View>
  );
};

export default SearchInput;
